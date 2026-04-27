-- Lift verification to the User level so tutees can also request verification.
ALTER TABLE "User"
  ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';

ALTER TABLE "User"
  ADD COLUMN "verificationNote" TEXT;

ALTER TABLE "User"
  ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3);

-- Backfill: any tutor that was already approved as VERIFIED stays verified at the user level.
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
