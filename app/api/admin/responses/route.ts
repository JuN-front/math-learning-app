import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');
  const phase = searchParams.get('phase');
  const page = parseInt(searchParams.get('page') ?? '1');

  const where = {
    ...(contentId ? { question: { content_id: contentId } } : {}),
    ...(phase ? { question: { phase } } : {}),
  };

  const [responses, total] = await Promise.all([
    prisma.questionResponse.findMany({
      where,
      include: {
        user: { select: { personal_id: true, group: true } },
        question: { select: { phase: true, level: true, set_key: true, body: true } },
      },
      orderBy: { submitted_at: 'desc' },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.questionResponse.count({ where }),
  ]);

  return NextResponse.json({ responses, total, page });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id, is_correct_override } = await request.json();
  const updated = await prisma.questionResponse.update({
    where: { id },
    data: { is_correct_override },
  });
  return NextResponse.json({ response: updated });
}