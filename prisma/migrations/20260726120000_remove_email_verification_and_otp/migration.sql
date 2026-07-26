-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerified",
DROP COLUMN "otpAttempts",
DROP COLUMN "otpCodeHash",
DROP COLUMN "otpExpiresAt",
DROP COLUMN "otpPurpose",
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiresAt" TIMESTAMP(3);
