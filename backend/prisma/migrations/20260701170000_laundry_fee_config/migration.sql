-- CreateTable
CREATE TABLE "laundry_fee_configs" (
    "id" TEXT NOT NULL,
    "laundryId" TEXT NOT NULL,
    "debitRate" DECIMAL(5,2) NOT NULL DEFAULT 1.45,
    "credit1xRate" DECIMAL(5,2) NOT NULL DEFAULT 2.10,
    "creditInstallmentsRate" DECIMAL(5,2) NOT NULL DEFAULT 2.34,
    "pixRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cashRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "anticipationRate" DECIMAL(5,2) NOT NULL DEFAULT 1.29,
    "applyAnticipation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laundry_fee_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "laundry_fee_configs_laundryId_key" ON "laundry_fee_configs"("laundryId");

-- AddForeignKey
ALTER TABLE "laundry_fee_configs" ADD CONSTRAINT "laundry_fee_configs_laundryId_fkey" FOREIGN KEY ("laundryId") REFERENCES "laundries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
