import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

function normalize(str: string): string {
  return str
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[　\s]/g, '')
    .replace(/／/g, '/');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contentId } = await params;
  const userId = session.user.id;
  const userGroup = session.user.group ?? null;

  const body = await request.json();
  if (body.isPreview) {
    return NextResponse.json({ response: { is_correct: false, attempt: 0 }, isPreview: true });
  }

  const { questionId, understanding, extraction, equation, answer, check, attachment_url, started_at } = body;

  if (!questionId || !answer) {
    return NextResponse.json({ error: 'questionId and answer required' }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { accepted_answers: true, content_id: true, published: true },
  });
  if (!question || question.content_id !== contentId || !question.published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const is_correct = question.accepted_answers.some(
    a => normalize(a) === normalize(answer)
  );

  const last = await prisma.questionResponse.findFirst({
    where: { user_id: userId, question_id: questionId },
    orderBy: { attempt: 'desc' },
    select: { attempt: true },
  });
  const attempt = (last?.attempt ?? 0) + 1;

  const response = await prisma.questionResponse.create({
    data: {
      user_id: userId,
      question_id: questionId,
      attempt,
      group: userGroup,
      understanding: understanding ?? null,
      extraction: extraction ?? null,
      equation: equation ?? null,
      answer,
      check: check ?? null,
      attachment_url: attachment_url ?? null,
      is_correct,
      started_at: new Date(started_at),
    },
  });

  return NextResponse.json({ response: { id: response.id, is_correct, attempt } });
}