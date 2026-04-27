import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { Role, SessionStatus, VerificationStatus } from "@/lib/enums";

const userAdminInclude = Prisma.validator<Prisma.UserInclude>()({
  profile: true,
  tutorProfile: {
    include: {
      subjects: {
        include: { subject: true },
      },
    },
  },
  tuteeProfile: true,
  _count: {
    select: {
      sentMessages: true,
      tutorSessions: true,
      tuteeSessions: true,
      writtenReviews: true,
      tutoringRequests: true,
    },
  },
});

type AdminUserRecord = Prisma.UserGetPayload<{
  include: typeof userAdminInclude;
}>;

export function formatAdminUser(user: AdminUserRecord) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
    isSuspended: user.isSuspended,
    schoolEmailVerifiedAt: user.schoolEmailVerifiedAt,
    createdAt: user.createdAt,
    profile: user.profile
      ? {
          fullName: user.profile.fullName,
          avatarUrl: user.profile.avatarUrl,
          major: user.profile.major,
          graduationYear: user.profile.graduationYear,
        }
      : null,
    tutorProfile: user.tutorProfile
      ? {
          id: user.tutorProfile.id,
          headline: user.tutorProfile.headline,
          hourlyRateCents: user.tutorProfile.hourlyRateCents,
          verificationStatus: user.tutorProfile.verificationStatus,
          subjects: user.tutorProfile.subjects.map((s) => ({
            department: s.subject.department,
            code: s.subject.code,
            name: s.subject.name,
          })),
        }
      : null,
    tuteeProfile: user.tuteeProfile
      ? {
          preferredBudgetCents: user.tuteeProfile.preferredBudgetCents,
          learningGoals: user.tuteeProfile.learningGoals,
        }
      : null,
    stats: {
      messagesSent: user._count.sentMessages,
      tutorSessions: user._count.tutorSessions,
      tuteeSessions: user._count.tuteeSessions,
      reviewsWritten: user._count.writtenReviews,
      requestsPosted: user._count.tutoringRequests,
    },
  };
}

export async function listAdminUsers(params: {
  search?: string | null;
  role?: string | null;
}) {
  const where: Prisma.UserWhereInput = {};
  if (params.search) {
    where.OR = [
      { email: { contains: params.search } },
      {
        profile: {
          fullName: { contains: params.search },
        },
      },
    ];
  }
  if (params.role && ["TUTOR", "TUTEE", "BOTH"].includes(params.role)) {
    where.role = params.role;
  }

  const users = await db.user.findMany({
    where,
    include: userAdminInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return users.map(formatAdminUser);
}

export async function getAdminStats() {
  const [
    userCount,
    tutorCount,
    tuteeCount,
    adminCount,
    suspendedCount,
    pendingVerification,
    requestCount,
    openRequestCount,
    threadCount,
    sessionCount,
    upcomingSessions,
    completedSessions,
    reviewCount,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: { in: [Role.TUTOR, Role.BOTH] } } }),
    db.user.count({ where: { role: { in: [Role.TUTEE, Role.BOTH] } } }),
    db.user.count({ where: { isAdmin: true } }),
    db.user.count({ where: { isSuspended: true } }),
    db.tutorProfile.count({
      where: { verificationStatus: VerificationStatus.PENDING },
    }),
    db.tutoringRequest.count(),
    db.tutoringRequest.count({ where: { status: "OPEN" } }),
    db.messageThread.count(),
    db.session.count(),
    db.session.count({
      where: { status: { in: [SessionStatus.PENDING, SessionStatus.CONFIRMED] } },
    }),
    db.session.count({ where: { status: SessionStatus.COMPLETED } }),
    db.review.count(),
  ]);

  return {
    userCount,
    tutorCount,
    tuteeCount,
    adminCount,
    suspendedCount,
    pendingVerification,
    requestCount,
    openRequestCount,
    threadCount,
    sessionCount,
    upcomingSessions,
    completedSessions,
    reviewCount,
  };
}

type PatchUserInput = {
  isAdmin?: boolean;
  isSuspended?: boolean;
  role?: string | null;
};

export async function patchUser(
  currentAdminId: string,
  targetUserId: string,
  input: PatchUserInput,
) {
  if (input.role && !["TUTOR", "TUTEE", "BOTH"].includes(input.role)) {
    throw new ApiError(400, "INVALID_INPUT", "role must be TUTOR, TUTEE, or BOTH.");
  }

  const target = await db.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  }

  if (target.id === currentAdminId && input.isAdmin === false) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "You cannot remove your own admin privileges.",
    );
  }
  if (target.id === currentAdminId && input.isSuspended === true) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      "You cannot suspend your own account.",
    );
  }

  const nextRole = input.role ?? target.role ?? Role.TUTEE;

  const data: Prisma.UserUpdateInput = {};
  if (input.isAdmin !== undefined) data.isAdmin = input.isAdmin;
  if (input.isSuspended !== undefined) data.isSuspended = input.isSuspended;
  if (input.role) data.role = input.role;

  const updated = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUserId },
      data,
    });

    if (input.role) {
      if (nextRole === Role.TUTOR || nextRole === Role.BOTH) {
        await tx.tutorProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
      }
      if (nextRole === Role.TUTEE || nextRole === Role.BOTH) {
        await tx.tuteeProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
      }
    }

    return tx.user.findUnique({
      where: { id: user.id },
      include: userAdminInclude,
    });
  });

  if (!updated) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Could not load updated user.");
  }
  return formatAdminUser(updated);
}

export async function deleteUser(currentAdminId: string, targetUserId: string) {
  if (currentAdminId === targetUserId) {
    throw new ApiError(400, "INVALID_INPUT", "You cannot delete your own account.");
  }
  const target = await db.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  }
  await db.user.delete({ where: { id: targetUserId } });
  return { id: targetUserId };
}

const adminTutorInclude = Prisma.validator<Prisma.TutorProfileInclude>()({
  user: {
    include: { profile: true },
  },
  subjects: {
    include: { subject: true },
  },
});

export async function listAdminTutors(params: { status?: string | null }) {
  const where: Prisma.TutorProfileWhereInput = {};
  if (params.status && ["UNVERIFIED", "PENDING", "VERIFIED"].includes(params.status)) {
    where.verificationStatus = params.status;
  }
  const tutors = await db.tutorProfile.findMany({
    where,
    include: adminTutorInclude,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return tutors.map((t) => ({
    id: t.id,
    userId: t.userId,
    headline: t.headline,
    hourlyRateCents: t.hourlyRateCents,
    verificationStatus: t.verificationStatus,
    updatedAt: t.updatedAt,
    user: {
      id: t.user.id,
      email: t.user.email,
      fullName: t.user.profile?.fullName ?? t.user.email,
      avatarUrl: t.user.profile?.avatarUrl ?? null,
      major: t.user.profile?.major ?? null,
    },
    subjects: t.subjects.map((s) => ({
      department: s.subject.department,
      code: s.subject.code,
      name: s.subject.name,
    })),
  }));
}

export async function setTutorVerification(
  tutorProfileId: string,
  status: string,
) {
  if (!["UNVERIFIED", "PENDING", "VERIFIED"].includes(status)) {
    throw new ApiError(400, "INVALID_INPUT", "Invalid verification status.");
  }
  const tutor = await db.tutorProfile.findUnique({ where: { id: tutorProfileId } });
  if (!tutor) {
    throw new ApiError(404, "USER_NOT_FOUND", "Tutor profile not found.");
  }
  const updated = await db.tutorProfile.update({
    where: { id: tutorProfileId },
    data: { verificationStatus: status },
  });
  return {
    id: updated.id,
    verificationStatus: updated.verificationStatus,
  };
}

export async function listAdminRequests() {
  const requests = await db.tutoringRequest.findMany({
    include: {
      subject: true,
      tutee: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return requests.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    preferredMode: r.preferredMode,
    createdAt: r.createdAt,
    subject: {
      department: r.subject.department,
      code: r.subject.code,
      name: r.subject.name,
    },
    tutee: {
      id: r.tutee.id,
      fullName: r.tutee.profile?.fullName ?? r.tutee.email,
      email: r.tutee.email,
      avatarUrl: r.tutee.profile?.avatarUrl ?? null,
    },
  }));
}

export async function setRequestStatus(requestId: string, status: string) {
  if (!["OPEN", "MATCHED", "CLOSED", "CANCELLED"].includes(status)) {
    throw new ApiError(400, "INVALID_INPUT", "Invalid request status.");
  }
  const existing = await db.tutoringRequest.findUnique({ where: { id: requestId } });
  if (!existing) {
    throw new ApiError(404, "REQUEST_NOT_FOUND", "Request not found.");
  }
  await db.tutoringRequest.update({
    where: { id: requestId },
    data: { status },
  });
  return { id: requestId, status };
}

export async function listAdminSessions() {
  const sessions = await db.session.findMany({
    include: {
      subject: true,
      tutor: { include: { profile: true } },
      tutee: { include: { profile: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 200,
  });

  return sessions.map((s) => ({
    id: s.id,
    status: s.status,
    mode: s.mode,
    scheduledAt: s.scheduledAt,
    durationMinutes: s.durationMinutes,
    agreedRateCents: s.agreedRateCents,
    subject: {
      department: s.subject.department,
      code: s.subject.code,
      name: s.subject.name,
    },
    tutor: {
      id: s.tutor.id,
      fullName: s.tutor.profile?.fullName ?? s.tutor.email,
      avatarUrl: s.tutor.profile?.avatarUrl ?? null,
    },
    tutee: {
      id: s.tutee.id,
      fullName: s.tutee.profile?.fullName ?? s.tutee.email,
      avatarUrl: s.tutee.profile?.avatarUrl ?? null,
    },
  }));
}
