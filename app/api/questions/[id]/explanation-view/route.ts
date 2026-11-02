import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/questions/[id]/explanation-view
// Body: { sub_question_id? }
// 解説閲覧をEventLogに記録し、最新レスポンスにexplanation_viewed_atをセット
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: questionId } = await params;
  const userId = session.user.id;

  let body: Record<string, string> = {};
  try { body = await request.json(); } catch { /* ok */ }

  const subQuestionId = body.sub_question_id ?? null;
  const now = new Date();

  let totalAttempts: number;
  let wrongAttempts: number;

  if (subQuestionId) {
    totalAttempts = await prisma.subQuestionResponse.count({
      where: { user_id: userId, sub_question_id: subQuestionId },
    });
    wrongAttempts = await prisma.subQuestionResponse.count({
      where: { user_id: userId, sub_question_id: subQuestionId, is_correct: false },
    });

    const latest = await prisma.subQuestionResponse.findFirst({
      where: { user_id: userId, sub_question_id: subQuestionId },
      orderBy: { submitted_at: 'desc' },
      select: { id: true, attempt: true, explanation_viewed_at: true },
    });
    if (latest && !latest.explanation_viewed_at) {
      await prisma.subQuestionResponse.update({
        where: { id: latest.id },
        data: { explanation_viewed_at: now, explanation_viewed_attempt: latest.attempt },
      });
    }
  } else {
    totalAttempts = await prisma.questionResponse.count({
      where: { user_id: userId, question_id: questionId },
    });
    wrongAttempts = await prisma.questionResponse.count({
      where: { user_id: userId, question_id: questionId, is_correct: false },
    });

    const latest = await prisma.questionResponse.findFirst({
      where: { user_id: userId, question_id: questionId },
      orderBy: { submitted_at: 'desc' },
      select: { id: true, attempt: true, explanation_viewed_at: true },
    });
    if (latest && !latest.explanation_viewed_at) {
      await prisma.questionResponse.update({
        where: { id: latest.id },
        data: { explanation_viewed_at: now, explanation_viewed_attempt: latest.attempt },
      });
    }
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { content_id: true },
  });

  await prisma.eventLog.create({
    data: {
      user_id: userId,
      content_id: question?.content_id ?? null,
      item_id: null,
      event: 'explanation_viewed',
      payload: {
        question_id: questionId,
        sub_question_id: subQuestionId,
        total_attempts: totalAttempts,
        wrong_attempts: wrongAttempts,
        viewed_at_attempt: totalAttempts,
      },
      client_time: now,
    },
  });

  return NextResponse.json({ ok: true });
}