-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "file_path" TEXT,
ADD COLUMN     "has_sub_questions" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SubQuestion" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "body" TEXT NOT NULL,
    "file_path" TEXT,
    "accepted_answers" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubQuestionResponse" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sub_question_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "group" TEXT,
    "understanding" TEXT,
    "extraction" TEXT,
    "equation" TEXT,
    "answer" TEXT NOT NULL,
    "check" TEXT,
    "attachment_url" TEXT,
    "is_correct" BOOLEAN NOT NULL,
    "is_correct_override" BOOLEAN,
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubQuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubQuestion_question_id_idx" ON "SubQuestion"("question_id");

-- CreateIndex
CREATE INDEX "SubQuestionResponse_sub_question_id_idx" ON "SubQuestionResponse"("sub_question_id");

-- CreateIndex
CREATE INDEX "SubQuestionResponse_user_id_idx" ON "SubQuestionResponse"("user_id");

-- AddForeignKey
ALTER TABLE "SubQuestion" ADD CONSTRAINT "SubQuestion_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubQuestionResponse" ADD CONSTRAINT "SubQuestionResponse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubQuestionResponse" ADD CONSTRAINT "SubQuestionResponse_sub_question_id_fkey" FOREIGN KEY ("sub_question_id") REFERENCES "SubQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
