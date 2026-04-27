-- Add columns for the verification document attachment uploaded by the user.
ALTER TABLE "User"
  ADD COLUMN "verificationDocumentUrl" TEXT;

ALTER TABLE "User"
  ADD COLUMN "verificationDocumentName" TEXT;

ALTER TABLE "User"
  ADD COLUMN "verificationDocumentType" TEXT;

ALTER TABLE "User"
  ADD COLUMN "verificationDocumentSize" INTEGER;
