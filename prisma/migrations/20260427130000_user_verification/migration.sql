-- move verification up to the user level so tutees can apply too
ALTER TABLE "User"
  ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';

ALTER TABLE "User"
  ADD COLUMN "verificationNote" TEXT;

ALTER TABLE "User"
  ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3);

-- carry over already-verified tutors to the user row
UPDATE "User" u
SET "verificationStatus" = 'VERIFIED'
FROM "TutorProfile" tp
WHERE tp."userId" = u.id
  AND tp."verificationStatus" = 'VERIFIED';

UPDATE "User" u
SET "verificationStatus" = 'PENDING',
    "verificationSubmittedAt" = COALESCE(u."verificationSubmittedAt", tp."updatedAt")
FROM "TutorProfile" tp
WHERE tp."userId" = u.id
  AND tp."verificationStatus" = 'PENDING'
  AND u."verificationStatus" = 'UNVERIFIED';
