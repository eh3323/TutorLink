import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "tutorlink123";
let cachedPasswordHash: string | null = null;
async function getDemoPasswordHash() {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  }
  return cachedPasswordHash;
}

function demoAvatarUrl(seed: string) {
  const handle = seed.split("@")[0] ?? seed;
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(handle)}&backgroundType=gradientLinear`;
}

const SUBJECTS = [
  { department: "CSCI", code: "UA 101", name: "Intro to Computer Science" },
  { department: "CSCI", code: "UA 102", name: "Data Structures" },
  { department: "CSCI", code: "UA 201", name: "Computer Systems Organization" },
  { department: "CSCI", code: "UA 310", name: "Basic Algorithms" },
  { department: "CSCI", code: "UA 470", name: "Object Oriented Programming" },
  { department: "MATH", code: "UA 121", name: "Calculus I" },
  { department: "MATH", code: "UA 122", name: "Calculus II" },
  { department: "MATH", code: "UA 211", name: "Linear Algebra" },
  { department: "MATH", code: "UA 233", name: "Probability and Statistics" },
  { department: "ECON", code: "UA 1", name: "Principles of Microeconomics" },
  { department: "ECON", code: "UA 2", name: "Principles of Macroeconomics" },
  { department: "PHYS", code: "UA 91", name: "Physics I" },
  { department: "CHEM", code: "UA 125", name: "General Chemistry I" },
  { department: "WRIT", code: "UA 1", name: "Writing the Essay" },
];

type TutorSeed = {
  email: string;
  fullName: string;
  major: string;
  graduationYear: number;
  bio: string;
  headline: string;
  hourlyRateCents: number;
  supportsOnline: boolean;
  supportsInPerson: boolean;
  defaultLocation: string | null;
  availabilityNotes: string;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED";
  subjectCodes: Array<{ code: string; department: string; isPrimary?: boolean; note?: string }>;
};

const TUTORS: TutorSeed[] = [
  {
    email: "ava.chen@nyu.edu",
    fullName: "Ava Chen",
    major: "Computer Science",
    graduationYear: 2026,
    bio: "CS junior who loves breaking algorithms down into small, friendly steps.",
    headline: "CSCI algorithms & data structures tutor",
    hourlyRateCents: 3500,
    supportsOnline: true,
    supportsInPerson: true,
    defaultLocation: "Bobst Library, 5th Floor",
    availabilityNotes: "Weeknights after 7pm, Sundays all day.",
    verificationStatus: "VERIFIED",
    subjectCodes: [
      { department: "CSCI", code: "UA 102", isPrimary: true, note: "TA for two semesters." },
      { department: "CSCI", code: "UA 310", note: "Got an A+ in Basic Algorithms." },
      { department: "CSCI", code: "UA 201" },
    ],
  },
  {
    email: "liam.park@nyu.edu",
    fullName: "Liam Park",
    major: "Mathematics",
    graduationYear: 2025,
    bio: "Applied math senior. Patient with anyone nervous about proofs.",
    headline: "Linear algebra & calculus tutor",
    hourlyRateCents: 3000,
    supportsOnline: true,
    supportsInPerson: true,
    defaultLocation: "Courant Institute lounge",
    availabilityNotes: "Weekday afternoons.",
    verificationStatus: "VERIFIED",
    subjectCodes: [
      { department: "MATH", code: "UA 211", isPrimary: true, note: "TA in Spring 2025." },
      { department: "MATH", code: "UA 121" },
      { department: "MATH", code: "UA 122" },
      { department: "MATH", code: "UA 233" },
    ],
  },
  {
    email: "sofia.gomez@nyu.edu",
    fullName: "Sofia Gomez",
    major: "Economics",
    graduationYear: 2027,
    bio: "Econ & business minor. Loves making supply/demand curves click.",
    headline: "Intro econ tutor that makes graphs make sense",
    hourlyRateCents: 2500,
    supportsOnline: true,
    supportsInPerson: false,
    defaultLocation: null,
    availabilityNotes: "Online only. Mondays, Wednesdays, Fridays.",
    verificationStatus: "UNVERIFIED",
    subjectCodes: [
      { department: "ECON", code: "UA 1", isPrimary: true },
      { department: "ECON", code: "UA 2" },
    ],
  },
  {
    email: "noah.williams@nyu.edu",
    fullName: "Noah Williams",
    major: "Physics",
    graduationYear: 2026,
    bio: "Physics major and unofficial whiteboard evangelist.",
    headline: "Physics I + Calc I study partner",
    hourlyRateCents: 4000,
    supportsOnline: false,
    supportsInPerson: true,
    defaultLocation: "Meyer Hall study rooms",
    availabilityNotes: "Tuesday/Thursday evenings.",
    verificationStatus: "PENDING",
    subjectCodes: [
      { department: "PHYS", code: "UA 91", isPrimary: true },
      { department: "MATH", code: "UA 121" },
    ],
  },
  {
    email: "emma.taylor@nyu.edu",
    fullName: "Emma Taylor",
    major: "Chemistry",
    graduationYear: 2025,
    bio: "Pre-med senior. Taught General Chem workshops for two years.",
    headline: "General chemistry + lab support",
    hourlyRateCents: 4500,
    supportsOnline: true,
    supportsInPerson: true,
    defaultLocation: "Silver Center cafeteria",
    availabilityNotes: "Most weekends.",
    verificationStatus: "VERIFIED",
    subjectCodes: [
      { department: "CHEM", code: "UA 125", isPrimary: true },
      { department: "WRIT", code: "UA 1", note: "Happy to review lab reports." },
    ],
  },
  {
    email: "kenji.ito@nyu.edu",
    fullName: "Kenji Ito",
    major: "Computer Science",
    graduationYear: 2027,
    bio: "Sophomore CS student who tutors the intro sequence on campus.",
    headline: "Intro CS + Python tutor",
    hourlyRateCents: 2000,
    supportsOnline: true,
    supportsInPerson: true,
    defaultLocation: "Kimmel Center 4th floor",
    availabilityNotes: "Weeknights 6 to 10pm.",
    verificationStatus: "UNVERIFIED",
    subjectCodes: [
      { department: "CSCI", code: "UA 101", isPrimary: true },
      { department: "CSCI", code: "UA 102" },
      { department: "CSCI", code: "UA 470" },
    ],
  },
];

type TuteeSeed = {
  email: string;
  fullName: string;
  major: string;
  graduationYear: number;
  learningGoals: string;
  preferredBudgetCents: number;
  supportsOnline: boolean;
  supportsInPerson: boolean;
  availabilityNotes: string;
};

const TUTEES: TuteeSeed[] = [
  {
    email: "maya.singh@nyu.edu",
    fullName: "Maya Singh",
    major: "Computer Science",
    graduationYear: 2028,
    learningGoals:
      "I need help preparing for Data Structures midterm. Linked lists and trees still feel scary.",
    preferredBudgetCents: 3000,
    supportsOnline: true,
    supportsInPerson: true,
    availabilityNotes: "Tuesday + Thursday evenings",
  },
  {
    email: "daniel.cho@nyu.edu",
    fullName: "Daniel Cho",
    major: "Business",
    graduationYear: 2027,
    learningGoals: "Looking for econ tutoring before finals. Prefer online sessions.",
    preferredBudgetCents: 2500,
    supportsOnline: true,
    supportsInPerson: false,
    availabilityNotes: "Weekends",
  },
];

type RequestSeed = {
  tuteeEmail: string;
  subject: { department: string; code: string };
  title: string;
  description: string;
  budgetMinCents: number;
  budgetMaxCents: number;
  preferredMode: "ONLINE" | "IN_PERSON";
  locationText: string | null;
};

const REQUESTS: RequestSeed[] = [
  {
    tuteeEmail: "maya.singh@nyu.edu",
    subject: { department: "CSCI", code: "UA 102" },
    title: "Need help reviewing trees and recursion",
    description:
      "Data Structures midterm in 10 days. I want a 60 minute session to walk through recursion, trees, and practice problems.",
    budgetMinCents: 2000,
    budgetMaxCents: 4000,
    preferredMode: "IN_PERSON",
    locationText: "Bobst Library",
  },
  {
    tuteeEmail: "daniel.cho@nyu.edu",
    subject: { department: "ECON", code: "UA 1" },
    title: "Microeconomics graphs + cost curves study partner",
    description:
      "Looking for help with supply/demand, consumer surplus, and marginal cost problems before the final.",
    budgetMinCents: 2000,
    budgetMaxCents: 3000,
    preferredMode: "ONLINE",
    locationText: null,
  },
];

async function ensureSubjects() {
  for (const subject of SUBJECTS) {
    await prisma.subject.upsert({
      where: {
        department_code: {
          department: subject.department,
          code: subject.code,
        },
      },
      update: { name: subject.name },
      create: subject,
    });
  }
}

async function ensureTutors() {
  const passwordHash = await getDemoPasswordHash();
  for (const tutor of TUTORS) {
    const avatarUrl = demoAvatarUrl(tutor.email);
    const user = await prisma.user.upsert({
      where: { email: tutor.email },
      update: {
        role: "TUTOR",
        passwordHash,
        schoolEmailVerifiedAt: new Date(),
      },
      create: {
        email: tutor.email,
        role: "TUTOR",
        passwordHash,
        schoolEmailVerifiedAt: new Date(),
      },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        fullName: tutor.fullName,
        major: tutor.major,
        bio: tutor.bio,
        graduationYear: tutor.graduationYear,
        avatarUrl,
      },
      create: {
        userId: user.id,
        fullName: tutor.fullName,
        major: tutor.major,
        bio: tutor.bio,
        graduationYear: tutor.graduationYear,
        avatarUrl,
      },
    });

    const tutorProfile = await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      update: {
        headline: tutor.headline,
        hourlyRateCents: tutor.hourlyRateCents,
        supportsOnline: tutor.supportsOnline,
        supportsInPerson: tutor.supportsInPerson,
        defaultLocation: tutor.defaultLocation,
        availabilityNotes: tutor.availabilityNotes,
        verificationStatus: tutor.verificationStatus,
      },
      create: {
        userId: user.id,
        headline: tutor.headline,
        hourlyRateCents: tutor.hourlyRateCents,
        supportsOnline: tutor.supportsOnline,
        supportsInPerson: tutor.supportsInPerson,
        defaultLocation: tutor.defaultLocation,
        availabilityNotes: tutor.availabilityNotes,
        verificationStatus: tutor.verificationStatus,
      },
    });

    for (const link of tutor.subjectCodes) {
      const subject = await prisma.subject.findUnique({
        where: {
          department_code: {
            department: link.department,
            code: link.code,
          },
        },
      });

      if (!subject) continue;

      await prisma.tutorSubject.upsert({
        where: {
          tutorProfileId_subjectId: {
            tutorProfileId: tutorProfile.id,
            subjectId: subject.id,
          },
        },
        update: {
          isPrimary: link.isPrimary ?? false,
          proficiencyNote: link.note ?? null,
        },
        create: {
          tutorProfileId: tutorProfile.id,
          subjectId: subject.id,
          isPrimary: link.isPrimary ?? false,
          proficiencyNote: link.note ?? null,
        },
      });
    }
  }
}

async function ensureTutees() {
  const passwordHash = await getDemoPasswordHash();
  for (const tutee of TUTEES) {
    const avatarUrl = demoAvatarUrl(tutee.email);
    const user = await prisma.user.upsert({
      where: { email: tutee.email },
      update: {
        role: "TUTEE",
        passwordHash,
        schoolEmailVerifiedAt: new Date(),
      },
      create: {
        email: tutee.email,
        role: "TUTEE",
        passwordHash,
        schoolEmailVerifiedAt: new Date(),
      },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        fullName: tutee.fullName,
        major: tutee.major,
        graduationYear: tutee.graduationYear,
        avatarUrl,
      },
      create: {
        userId: user.id,
        fullName: tutee.fullName,
        major: tutee.major,
        graduationYear: tutee.graduationYear,
        avatarUrl,
      },
    });

    await prisma.tuteeProfile.upsert({
      where: { userId: user.id },
      update: {
        learningGoals: tutee.learningGoals,
        preferredBudgetCents: tutee.preferredBudgetCents,
        supportsOnline: tutee.supportsOnline,
        supportsInPerson: tutee.supportsInPerson,
        availabilityNotes: tutee.availabilityNotes,
      },
      create: {
        userId: user.id,
        learningGoals: tutee.learningGoals,
        preferredBudgetCents: tutee.preferredBudgetCents,
        supportsOnline: tutee.supportsOnline,
        supportsInPerson: tutee.supportsInPerson,
        availabilityNotes: tutee.availabilityNotes,
      },
    });
  }
}

async function ensureRequests() {
  for (const request of REQUESTS) {
    const tutee = await prisma.user.findUnique({ where: { email: request.tuteeEmail } });
    const subject = await prisma.subject.findUnique({
      where: {
        department_code: request.subject,
      },
    });

    if (!tutee || !subject) continue;

    const existing = await prisma.tutoringRequest.findFirst({
      where: {
        tuteeId: tutee.id,
        subjectId: subject.id,
        title: request.title,
      },
    });

    if (existing) continue;

    await prisma.tutoringRequest.create({
      data: {
        tuteeId: tutee.id,
        subjectId: subject.id,
        title: request.title,
        description: request.description,
        budgetMinCents: request.budgetMinCents,
        budgetMaxCents: request.budgetMaxCents,
        preferredMode: request.preferredMode,
        locationText: request.locationText,
      },
    });
  }
}

async function ensureDemoReview() {
  const tutor = await prisma.user.findUnique({
    where: { email: "ava.chen@nyu.edu" },
  });
  const tutee = await prisma.user.findUnique({
    where: { email: "maya.singh@nyu.edu" },
  });
  const subject = await prisma.subject.findUnique({
    where: {
      department_code: {
        department: "CSCI",
        code: "UA 102",
      },
    },
  });

  if (!tutor || !tutee || !subject) return;

  const existing = await prisma.session.findFirst({
    where: {
      tutorId: tutor.id,
      tuteeId: tutee.id,
      subjectId: subject.id,
      status: "COMPLETED",
    },
  });

  let sessionId = existing?.id;

  if (!existing) {
    const session = await prisma.session.create({
      data: {
        tutorId: tutor.id,
        tuteeId: tutee.id,
        subjectId: subject.id,
        proposedById: tutor.id,
        scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        durationMinutes: 60,
        mode: "IN_PERSON",
        locationText: "Bobst Library",
        agreedRateCents: 3500,
        status: "COMPLETED",
        notes: "Recursion + tree review.",
      },
    });
    sessionId = session.id;
  }

  if (!sessionId) return;

  const existingReview = await prisma.review.findFirst({
    where: { sessionId, authorId: tutee.id },
  });

  if (existingReview) return;

  await prisma.review.create({
    data: {
      sessionId,
      authorId: tutee.id,
      revieweeId: tutor.id,
      rating: 5,
      comment: "Ava broke down recursion in a way that finally clicked. Highly recommend.",
    },
  });
}

async function ensureAdmin() {
  const passwordHash = await getDemoPasswordHash();
  const avatarUrl = demoAvatarUrl("admin@nyu.edu");

  const admin = await prisma.user.upsert({
    where: { email: "admin@nyu.edu" },
    update: {
      passwordHash,
      isAdmin: true,
      isSuspended: false,
      role: "BOTH",
      schoolEmailVerifiedAt: new Date(),
    },
    create: {
      email: "admin@nyu.edu",
      passwordHash,
      isAdmin: true,
      role: "BOTH",
      schoolEmailVerifiedAt: new Date(),
    },
  });

  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: {
      fullName: "TutorLink Admin",
      major: "Operations",
      avatarUrl,
    },
    create: {
      userId: admin.id,
      fullName: "TutorLink Admin",
      major: "Operations",
      avatarUrl,
    },
  });

  // give ava admin too so seed has a second admin to play with
  await prisma.user.updateMany({
    where: { email: "ava.chen@nyu.edu" },
    data: { isAdmin: true },
  });
}

async function main() {
  await ensureSubjects();
  await ensureTutors();
  await ensureTutees();
  await ensureAdmin();
  await ensureRequests();
  await ensureDemoReview();
  console.log(
    `seed done. all demo accounts share the password "${DEMO_PASSWORD}". ` +
      `admin: admin@nyu.edu (ava.chen@nyu.edu also has admin).`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
