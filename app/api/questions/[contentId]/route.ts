import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contentId } = await params;
  const userGroup = session.user.group ?? null;

  const previewGroup = request.nextUrl.searchParams.get('previewGroup');
  const isPreview = session.user.role === 'admin' && !!previewGroup;
  const effectiveGroup = isPreview ? previewGroup : userGroup;

  const allQuestions = await prisma.question.findMany({
    where: {
      content_id: contentId,
      ...(isPreview ? {} : { published: true }),
    },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      body: true,
      phase: true,
      answer_mode: true,
      allow_attachment: true,
      show_feedback: true,
      published: true,
      groups: true,
    },
  });

  if (session.user.role === 'admin' && !isPreview) {
    return NextResponse.json({ questions: allQuestions, userGroup, isPreview: false });
  }

  const filtered = allQuestions.filter(q => {
    if (q.phase === 'practice') return true;
    if (!effectiveGroup) return false;
    return q.groups.includes(effectiveGroup);
  });

  return NextResponse.json({ questions: filtered, userGroup: effectiveGroup, isPreview });
}