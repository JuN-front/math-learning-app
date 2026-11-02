-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "exp_answer" TEXT,
ADD COLUMN     "exp_check" TEXT,
ADD COLUMN     "exp_equation" TEXT,
ADD COLUMN     "exp_extraction" TEXT,
ADD COLUMN     "exp_understanding" TEXT,
ADD COLUMN     "has_explanation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QuestionResponse" ADD COLUMN     "explanation_viewed_at" TIMESTAMP(3),
ADD COLUMN     "explanation_viewed_attempt" INTEGER;

-- AlterTable
ALTER TABLE "SubQuestion" ADD COLUMN     "exp_answer" TEXT,
ADD COLUMN     "exp_check" TEXT,
ADD COLUMN     "exp_equation" TEXT,
ADD COLUMN     "exp_extraction" TEXT,
ADD COLUMN     "exp_understanding" TEXT,
ADD COLUMN     "has_explanation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SubQuestionResponse" ADD COLUMN     "explanation_viewed_at" TIMESTAMP(3),
ADD COLUMN     "explanation_viewed_attempt" INTEGER;
