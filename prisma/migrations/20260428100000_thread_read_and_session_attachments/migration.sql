-- track per-side last-read timestamps so the bell can clear once you've actually read the thread
ALTER TABLE "MessageThread" ADD COLUMN "tutorLastReadAt" TIMESTAMP(3);
ALTER TABLE "MessageThread" ADD COLUMN "tuteeLastReadAt" TIMESTAMP(3);

-- session attachments: shared course materials for online sessions only (the
-- mode check is enforced in the api). file payloads live in vercel blob; we
-- only keep metadata here so we can authorise + render the list.
CREATE TABLE "SessionAttachment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionAttachment_sessionId_idx" ON "SessionAttachment"("sessionId");

ALTER TABLE "SessionAttachment"
  ADD CONSTRAINT "SessionAttachment_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionAttachment"
  ADD CONSTRAINT "SessionAttachment_uploaderId_fkey"
  FOREIGN KEY ("uploaderId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
