-- yjs op log used by live code editor (server-relay collab). each row is one
-- Y.Doc update encoded as bytes; clients append theirs + poll for newer ones.
CREATE TABLE "YjsOp" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "docKey" TEXT NOT NULL,
    "payload" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YjsOp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "YjsOp_sessionId_docKey_createdAt_idx"
  ON "YjsOp" ("sessionId", "docKey", "createdAt");
