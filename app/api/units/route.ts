import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  const units = await prisma.unit.findMany({
    include: {
      contents: {
        include: { items: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  // 進捗を取得
  const progresses = await prisma.progress.findMany({
    where: { user_id: userId },
  });
  const progressMap = new Map(progresses.map(p => [p.content_id, p.status]));

  // total_contents / completed_contents を付与
  const unitsWithProgress = units.map(unit => {
    const total = unit.contents.length;
    const completed = unit.contents.filter(c => progressMap.get(c.id) === 'completed').length;
    return { ...unit, total_contents: total, completed_contents: completed };
  });

  return NextResponse.json(unitsWithProgress);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, description, order } = await request.json();

  const unit = await prisma.unit.create({
    data: { title, description: description ?? '', order: order ?? 0 },
    include: { contents: true },
  });

  return NextResponse.json(unit);
}