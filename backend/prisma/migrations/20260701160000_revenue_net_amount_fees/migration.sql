-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
ALTER TABLE "revenues" ADD COLUMN "netAmount" DECIMAL(12,2),
ADD COLUMN "feeRate" DECIMAL(5,2),
ADD COLUMN "feeAmount" DECIMAL(12,2),
ADD COLUMN "cardType" "CardType",
ADD COLUMN "installments" INTEGER;
