-- doc upload metadata for verification
ALTER TABLE "User"
  ADD COLUMN "verificationDocumentUrl" TEXT;

ALTER TABLE "User"
  ADD COLUMN "verificationDocumentName" TEXT;

ALTER TABLE "User"
  ADD COLUMN "verificationDocumentType" TEXT;

ALTER TABLE "User"
  ADD COLUMN "verificationDocumentSize" INTEGER;
