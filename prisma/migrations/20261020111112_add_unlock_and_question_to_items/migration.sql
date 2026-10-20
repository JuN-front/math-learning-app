/*
  Warnings:

  - You are about to drop the `ItemSubmission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ItemSubmission" DROP CONSTRAINT "ItemSubmission_content_id_fkey";

-- DropForeignKey
ALTER TABLE "ItemSubmission" DROP CONSTRAINT "ItemSubmission_item_id_fkey";

-- DropForeignKey
ALTER TABLE "ItemSubmission" DROP CONSTRAINT "ItemSubmission_user_id_fkey";

-- DropIndex
DROP INDEX "QuestionResponse_user_id_question_id_idx";

-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN     "question_id" TEXT,
ADD COLUMN     "unlock_after_item_id" TEXT;

-- AlterTable
ALTER TABLE "QuestionResponse" ALTER COLUMN "started_at" DROP NOT NULL;

-- DropTable
DROP TABLE "ItemSubmission";

-- CreateIndex
CREATE INDEX "QuestionResponse_question_id_idx" ON "QuestionResponse"("question_id");

-- CreateIndex
CREATE INDEX "QuestionResponse_user_id_idx" ON "QuestionResponse"("user_id");
