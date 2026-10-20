import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/questions — admin: all questions; student: published only
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = session.user.role === 'admin';
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');

  const where: Record<string, unknown> = {};
  if (contentId) where.content_id = contentId;
  if (!isAdmin) where.published = true;

  const questions = await prisma.question.findMany({
    where,
    orderBy: { order: 'asc' },
    select: {
      id: true,
      content_id: true,
      order: true,
      phase: true,
      body: true,
      answer_mode: true,
      allow_attachment: true,
      show_feedback: true,
      published: true,
      level: true,
      set_key: true,
      groups: true,
      created_at: true,
      updated_at: true,
      // NEVER include accepted_answers
    },
  });

  return NextResponse.json(questions);
}