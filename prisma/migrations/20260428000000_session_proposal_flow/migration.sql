-- session becomes a proposal that the other side has to accept
ALTER TABLE "Session"
  ADD COLUMN "proposedById" TEXT;

ALTER TABLE "Session"
  ADD COLUMN "cancelledById" TEXT;

ALTER TABLE "Session"
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

ALTER TABLE "Session"
  ADD COLUMN "cancellationReason" TEXT;

ALTER TABLE "Session"
  ADD COLUMN "roomToken" TEXT;

-- backfill existing sessions: assume tutor proposed, give every row a unique room token
UPDATE "Session"
SET "proposedById" = "tutorId"
WHERE "proposedById" IS NULL;

UPDATE "Session"
SET "roomToken" = md5(random()::text || clock_timestamp()::text || id)
WHERE "roomToken" IS NULL;

ALTER TABLE "Session"
  ALTER COLUMN "proposedById" SET NOT NULL;

ALTER TABLE "Session"
  ALTER COLUMN "roomToken" SET NOT NULL;

CREATE UNIQUE INDEX "Session_roomToken_key" ON "Session"("roomToken");
