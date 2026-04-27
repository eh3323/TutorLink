import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { canActAsTutee, canActAsTutor } from "@/lib/permissions";

const publicUserInclude = Prisma.validator<Prisma.UserInclude>()({
  profile: true,
  tutorProfile: {
    include: {
      subjects: {
        include: { subject: true },
      },
    },
  },
  tuteeProfile: true,
  receivedReviews: {
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      author: { include: { profile: true } },
      session: { include: { subject: true } },
    },
  },
});

type PublicUserRecord = Prisma.UserGetPayload<{
  include: typeof publicUserInclude;
}>;

function formatSubjectLabel(subject: { department: string; code: string; name: string }) {
  return `${subject.department} ${subject.code} - ${subject.name}`;
}

function calculateAverageRating(reviews: Array<{ rating: number }>) {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Number((total / reviews.length).toFixed(2));
}

function formatPublicUser(user: PublicUserRecord) {
  if (!user.profile) {
    throw new ApiError(404, "USER_NOT_FOUND", "Profile is not set up yet.");
  }

  const role = user.role ?? null;
  const showTutor = canActAsTutor(role) && user.tutorProfile != null;
  const showTutee = canActAsTutee(role) && user.tuteeProfile != null;

  return {
    id: user.id,
    role,
    isAdmin: user.isAdmin === true,
    verificationStatus: user.verificationStatus,
    profile: {
      fullName: user.profile.fullName,
      major: user.profile.major,
      bio: user.profile.bio,
      school: user.profile.school,
      graduationYear: user.profile.graduationYear,
      avatarUrl: user.profile.avatarUrl,
    },
    tutorProfile:
      showTutor && user.tutorProfile
        ? {
            headline: user.tutorProfile.headline,
            hourlyRateCents: user.tutorProfile.hourlyRateCents,
            supportsOnline: user.tutorProfile.supportsOnline,
            supportsInPerson: user.tutorProfile.supportsInPerson,
            defaultLocation: user.tutorProfile.defaultLocation,
            availabilityNotes: user.tutorProfile.availabilityNotes,
            verificationStatus: user.tutorProfile.verificationStatus,
            subjects: user.tutorProfile.subjects.map(({ proficiencyNote, isPrimary, subject }) => ({
              id: subject.id,
              department: subject.department,
              code: subject.code,
              name: subject.name,
              label: formatSubjectLabel(subject),
              proficiencyNote,
              isPrimary,
            })),
          }
        : null,
    tuteeProfile:
      showTutee && user.tuteeProfile
        ? {
            learningGoals: user.tuteeProfile.learningGoals,
            preferredBudgetCents: user.tuteeProfile.preferredBudgetCents,
            supportsOnline: user.tuteeProfile.supportsOnline,
            supportsInPerson: user.tuteeProfile.supportsInPerson,
            availabilityNotes: user.tuteeProfile.availabilityNotes,
          }
        : null,
    stats: {
      averageRating: calculateAverageRating(user.receivedReviews),
      reviewCount: user.receivedReviews.length,
    },
    recentReviews: user.receivedReviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      author: {
        id: review.author.id,
        fullName: review.author.profile?.fullName ?? "Anonymous",
      },
      subject:
        review.session?.subject == null
          ? null
          : {
              id: review.session.subject.id,
              department: review.session.subject.department,
              code: review.session.subject.code,
              name: review.session.subject.name,
              label: formatSubjectLabel(review.session.subject),
            },
    })),
  };
}

export async function getPublicUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: publicUserInclude,
  });

  if (!user || !user.profile) {
    throw new ApiError(404, "USER_NOT_FOUND", "User profile was not found.");
  }

  return formatPublicUser(user);
}
