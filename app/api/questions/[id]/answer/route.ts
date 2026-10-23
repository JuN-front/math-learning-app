import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const normalize = (s: string) =>
  s.trim().replace(/\s+/g, '').replace(/[　]/g, '').toLowerCase();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: questionId } = await params;
  const userId = session.user.id;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      answer_mode: true,
      accepted_answers: true,
      has_sub_questions: true,
      show_feedback: true,
      published: true,
    },
  });

  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!question.published && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const answer = (body.answer ?? '').trim();
  if (!answer) return NextResponse.json({ error: 'Answer required' }, { status: 400 });

  // --- Sub-question answer ---
  if (body.sub_question_id) {
    const subQ = await prisma.subQuestion.findUnique({
      where: { id: body.sub_question_id },
      select: { id: true, accepted_answers: true },
    });
    if (!subQ) return NextResponse.json({ error: 'SubQuestion not found' }, { status: 404 });

    const normalizedAnswer = normalize(answer);
    const is_correct = subQ.accepted_answers.some(a => normalize(a) === normalizedAnswer);

    const prevAttempts = await prisma.subQuestionResponse.count({
      where: { user_id: userId, sub_question_id: subQ.id },
    });

    await prisma.subQuestionResponse.create({
      data: {
        user_id: userId,
        sub_question_id: subQ.id,
        attempt: prevAttempts + 1,
        group: session.user.group ?? null,
        understanding: body.understanding ?? null,
        extraction: body.extraction ?? null,
        equation: body.equation ?? null,
        answer,
        check: body.check ?? null,
        is_correct,
        started_at: null,
      },
    });

    const responseBody: { is_correct: boolean; message?: string } = { is_correct };
    if (question.show_feedback && !is_correct) {
      responseBody.message = '答えが合いませんでした。もう一度確認してみましょう。';
    }
    return NextResponse.json(responseBody);
  }

  // --- Main question answer ---
  const normalizedAnswer = normalize(answer);
  const is_correct = question.accepted_answers.some(a => normalize(a) === normalizedAnswer);

  const prevAttempts = await prisma.questionResponse.count({
    where: { user_id: userId, question_id: questionId },
  });

  await prisma.questionResponse.create({
    data: {
      user_id: userId,
      question_id: questionId,
      attempt: prevAttempts + 1,
      group: session.user.group ?? null,
      understanding: body.understanding ?? null,
      extraction: body.extraction ?? null,
      equation: body.equation ?? null,
      answer,
      check: body.check ?? null,
      is_correct,
      started_at: null,
    },
  });

  const responseBody: { is_correct: boolean; message?: string } = { is_correct };
  if (question.show_feedback && !is_correct) {
    responseBody.message = '答えが合いませんでした。もう一度確認してみましょう。';
  }
  return NextResponse.json(responseBody);
}