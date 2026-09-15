-- CreateTable
CREATE TABLE "ArchivedRevenue" (
    "id" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "collectedMonth" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentCount" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivedRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchivedRevenue_collectedMonth_idx" ON "ArchivedRevenue"("collectedMonth");
