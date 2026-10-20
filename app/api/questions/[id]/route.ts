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
      answer_mode: true,
      allow_attachment: true,
      show_feedback: true,
      published: true,
      level: true,
      set_key: true,
      groups: true,
      // NEVER include accepted_answers
    },
  });

  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Students can only see published questions
  if (!isAdmin && !question.published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(question);
}