import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/questions/[id]/explanation?sub_question_id=xxx
// 3回以上不正解の場合のみ解説を返す。accepted_answersは絶対に返さない。
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: questionId } = await params;
  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const subQuestionId = searchParams.get('sub_question_id');

  if (subQuestionId) {
    const wrongCount = await prisma.subQuestionResponse.count({
      where: { user_id: userId, sub_question_id: subQuestionId, is_correct: false },
    });
    if (wrongCount < 3) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const subQ = await prisma.subQuestion.findUnique({
      where: { id: subQuestionId },
      select: {
        has_explanation: true,
        exp_understanding: true,
        exp_extraction: true,
        exp_equation: true,
        exp_answer: true,
        exp_check: true,
      },
    });
    if (!subQ || !subQ.has_explanation) {
      return NextResponse.json({ error: 'No explanation available' }, { status: 404 });
    }
    return NextResponse.json({
      explanation: {
        exp_understanding: subQ.exp_understanding,
        exp_extraction: subQ.exp_extraction,
        exp_equation: subQ.exp_equation,
        exp_answer: subQ.exp_answer,
        exp_check: subQ.exp_check,
      },
    });
  }

  // Main question
  const wrongCount = await prisma.questionResponse.count({
    where: { user_id: userId, question_id: questionId, is_correct: false },
  });
  if (wrongCount < 3) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      published: true,
      has_explanation: true,
      exp_understanding: true,
      exp_extraction: true,
      exp_equation: true,
      exp_answer: true,
      exp_check: true,
    },
  });
  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!question.published && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!question.has_explanation) {
    return NextResponse.json({ error: 'No explanation available' }, { status: 404 });
  }

  return NextResponse.json({
    explanation: {
      exp_understanding: question.exp_understanding,
      exp_extraction: question.exp_extraction,
      exp_equation: question.exp_equation,
      exp_answer: question.exp_answer,
      exp_check: question.exp_check,
    },
  });
}