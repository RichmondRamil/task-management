/*
  Warnings:

  - The `role` column on the `project_members` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `projects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priority` column on the `tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('active', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('todo', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "public"."MemberRole" AS ENUM ('owner', 'admin', 'member');

-- AlterTable
ALTER TABLE "public"."project_members" DROP COLUMN "role",
ADD COLUMN     "role" "public"."MemberRole" NOT NULL DEFAULT 'member';

-- AlterTable
ALTER TABLE "public"."projects" DROP COLUMN "status",
ADD COLUMN     "status" "public"."ProjectStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "public"."tasks" DROP COLUMN "status",
ADD COLUMN     "status" "public"."TaskStatus" NOT NULL DEFAULT 'todo',
DROP COLUMN "priority",
ADD COLUMN     "priority" "public"."TaskPriority" NOT NULL DEFAULT 'medium';
