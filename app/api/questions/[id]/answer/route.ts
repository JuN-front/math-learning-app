import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const normalize = (s: string) =>
  s.trim().replace(/\s+/g, '').replace(/[　]/g, '').toLowerCase();

// POST /api/questions/[id]/answer
// Body for direct/staged question: { understanding?, extraction?, equation?, answer, check? }
// Body for sub-question:           { sub_question_id, understanding?, extraction?, equation?, answer, check? }
// SECURITY: accepted_answers are fetched server-side only, never sent to client.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: questionId } = await context.params;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const answer = String(body.answer ?? '').trim();
  if (!answer) return NextResponse.json({ error: 'Answer required' }, { status: 400 });

  // --- Sub-question answer ---
  if (body.sub_question_id) {
    const subQ = await prisma.subQuestion.findUnique({
      where: { id: String(body.sub_question_id) },
      select: {
        id: true,
        accepted_answers: true,
        has_explanation: true,
        exp_understanding: true,
        exp_extraction: true,
        exp_equation: true,
        exp_answer: true,
        exp_check: true,
      },
    });
    if (!subQ) return NextResponse.json({ error: 'SubQuestion not found' }, { status: 404 });

    const is_correct = subQ.accepted_answers.some(a => normalize(a) === normalize(answer));

    const prevWrong = await prisma.subQuestionResponse.count({
      where: { user_id: userId, sub_question_id: subQ.id, is_correct: false },
    });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp: Record<string, any> = { is_correct };
    if (is_correct && subQ.has_explanation) {
      resp.explanation = {
        exp_understanding: subQ.exp_understanding,
        exp_extraction: subQ.exp_extraction,
        exp_equation: subQ.exp_equation,
        exp_answer: subQ.exp_answer,
        exp_check: subQ.exp_check,
      };
    } else if (!is_correct && prevWrong + 1 >= 3 && subQ.has_explanation) {
      resp.explanation_unlocked = true;
    }
    return NextResponse.json(resp);
  }

  // --- Main question answer ---
  const is_correct = question.accepted_answers.some(a => normalize(a) === normalize(answer));

  const prevWrong = await prisma.questionResponse.count({
    where: { user_id: userId, question_id: questionId, is_correct: false },
  });
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp: Record<string, any> = { is_correct };
  if (is_correct && question.has_explanation) {
    resp.explanation = {
      exp_understanding: question.exp_understanding,
      exp_extraction: question.exp_extraction,
      exp_equation: question.exp_equation,
      exp_answer: question.exp_answer,
      exp_check: question.exp_check,
    };
  } else if (!is_correct && prevWrong + 1 >= 3 && question.has_explanation) {
    resp.explanation_unlocked = true;
  }
  return NextResponse.json(resp);
}