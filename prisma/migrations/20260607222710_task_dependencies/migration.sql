-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskDependency_blockerId_idx" ON "TaskDependency"("blockerId");

-- CreateIndex
CREATE INDEX "TaskDependency_blockedId_idx" ON "TaskDependency"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_blockerId_blockedId_key" ON "TaskDependency"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
