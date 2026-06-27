import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id as string;

  const units = await prisma.unit.findMany({
    orderBy: { order: 'asc' },
    include: { contents: true },
  });

  const result = await Promise.all(units.map(async (unit: any) => {
    const contentIds = unit.contents.map((c: any) => c.id);
    const completedCount = await prisma.progress.count({
      where: {
        user_id: userId,
        content_id: { in: contentIds },
        status: 'completed',
      },
    });
    return {
      ...unit,
      contents: undefined,
      total_contents: unit.contents.length,
      completed_contents: completedCount,
    };
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const maxOrder = await prisma.unit.aggregate({ _max: { order: true } });

  const unit = await prisma.unit.create({
    data: {
      title: body.title,
      description: body.description || '',
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  return NextResponse.json(unit, { status: 201 });
}
