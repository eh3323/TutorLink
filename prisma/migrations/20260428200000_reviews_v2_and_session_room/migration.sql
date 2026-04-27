-- two-way reviews: criteria, direction, reply, verified flag
ALTER TABLE "Review" ADD COLUMN "ratingPunctuality" INTEGER;
ALTER TABLE "Review" ADD COLUMN "ratingPreparation" INTEGER;
ALTER TABLE "Review" ADD COLUMN "ratingCommunication" INTEGER;
ALTER TABLE "Review" ADD COLUMN "ratingHelpfulness" INTEGER;
ALTER TABLE "Review" ADD COLUMN "ratingRespectful" INTEGER;
ALTER TABLE "Review" ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'TUTEE_TO_TUTOR';
ALTER TABLE "Review" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Review" ADD COLUMN "reply" TEXT;
ALTER TABLE "Review" ADD COLUMN "replyAt" TIMESTAMP(3);

-- backfill direction for existing rows: if author == tutor of session it's TUTOR_TO_TUTEE, else TUTEE_TO_TUTOR
UPDATE "Review" r
SET "direction" = CASE WHEN s."tutorId" = r."authorId" THEN 'TUTOR_TO_TUTEE' ELSE 'TUTEE_TO_TUTOR' END
FROM "Session" s
WHERE s."id" = r."sessionId";

-- session room: recording consent / output, billing meter, ai summary
ALTER TABLE "Session" ADD COLUMN "recordingConsentTutorAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "recordingConsentTuteeAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "recordingUrl" TEXT;
ALTER TABLE "Session" ADD COLUMN "recordingStartedAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "recordingEndedAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "meterMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Session" ADD COLUMN "meterFinalisedAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "summary" TEXT;
ALTER TABLE "Session" ADD COLUMN "summaryGeneratedAt" TIMESTAMP(3);
