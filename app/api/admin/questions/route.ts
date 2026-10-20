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
  const questions = await prisma.question.findMany({
    where: contentId ? { content_id: contentId } : undefined,
    orderBy: [{ content_id: 'asc' }, { phase: 'asc' }, { order: 'asc' }],
  });
  return NextResponse.json({ questions });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const data = await request.json();

  if (data.createSet) {
    const { contentId, phase, set_key, accepted_answers, answer_mode, allow_attachment, bodies } = data;

    const existingSets = await prisma.question.findMany({
      where: { content_id: contentId, phase, level: { not: null } },
      select: { set_key: true },
      distinct: ['set_key'],
      orderBy: { created_at: 'asc' },
    });
    const setIndex = existingSets.length;

    const levels = ['L0', 'L1', 'L2'] as const;
    const groupLabels = ['A', 'B', 'C'];

    const groupToLevel: Record<string, string> = {};
    groupLabels.forEach((g, gi) => {
      groupToLevel[g] = levels[(gi + setIndex) % 3];
    });

    const levelToGroups: Record<string, string[]> = { L0: [], L1: [], L2: [] };
    groupLabels.forEach(g => {
      levelToGroups[groupToLevel[g]].push(g);
    });

    const maxOrder = await prisma.question.findFirst({
      where: { content_id: contentId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const baseOrder = (maxOrder?.order ?? -1) + 1;

    const created = await Promise.all(
      levels.map((level, li) =>
        prisma.question.create({
          data: {
            content_id: contentId,
            phase,
            body: bodies[level],
            level,
            set_key,
            groups: levelToGroups[level],
            answer_mode: answer_mode ?? 'staged',
            accepted_answers,
            allow_attachment: allow_attachment ?? false,
            show_feedback: false,
            published: false,
            order: baseOrder + li,
          },
        })
      )
    );
    return NextResponse.json({ questions: created });
  }

  const question = await prisma.question.create({
    data: {
      ...data,
      level: null,
      set_key: null,
      groups: [],
    },
  });
  return NextResponse.json({ question });
}