import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/questions/[id] — returns question WITHOUT accepted_answers
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.user.role === 'admin';

  const question = await prisma.question.findUnique({
    where: { id },
    select: {
      id: true,
      content_id: true,
      order: true,
      phase: true,
      body: true,
      file_path: true,
      answer_mode: true,
      has_sub_questions: true,
      allow_attachment: true,
      show_feedback: true,
      published: true,
      level: true,
      set_key: true,
      groups: true,
      // NEVER include accepted_answers
      sub_questions: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          order: true,
          body: true,
          file_path: true,
          // NEVER include accepted_answers
        },
      },
    },
  });

  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!isAdmin && !question.published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(question);
}