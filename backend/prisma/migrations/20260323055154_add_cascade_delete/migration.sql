-- DropForeignKey
ALTER TABLE "PlanningTask" DROP CONSTRAINT "PlanningTask_projectId_fkey";

-- DropForeignKey
ALTER TABLE "RoadmapTask" DROP CONSTRAINT "RoadmapTask_projectId_fkey";

-- AddForeignKey
ALTER TABLE "PlanningTask" ADD CONSTRAINT "PlanningTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapTask" ADD CONSTRAINT "RoadmapTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
