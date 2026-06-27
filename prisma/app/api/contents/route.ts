import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get('unit_id');

  const contents = await prisma.content.findMany({
    where: unitId ? { unit_id: unitId } : undefined,
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(contents);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const maxOrder = await prisma.content.aggregate({
    where: { unit_id: body.unit_id },
    _max: { order: true },
  });

  const content = await prisma.content.create({
    data: {
      unit_id: body.unit_id,
      title: body.title,
      description: body.description || '',
      order: (maxOrder._max.order ?? 0) + 1,
      has_video: body.has_video ?? false,
      has_textbook: body.has_textbook ?? false,
      has_assignment: body.has_assignment ?? false,
      lock_conditions: body.lock_conditions ?? [],
    },
  });

  return NextResponse.json(content, { status: 201 });
}
