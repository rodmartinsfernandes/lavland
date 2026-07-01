-- AlterTable
ALTER TABLE "payables" ADD COLUMN "expenseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payables_expenseId_key" ON "payables"("expenseId");

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
