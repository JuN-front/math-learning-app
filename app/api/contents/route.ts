import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get('unitId');
  if (!unitId) return NextResponse.json({ error: 'unitId required' }, { status: 400 });

  const contents = await prisma.content.findMany({
    where: { unit_id: unitId },
    include: { items: { orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(contents);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { unit_id, title, description, order, lock_conditions } = await request.json();

  const content = await prisma.content.create({
    data: {
      unit_id,
      title,
      description: description ?? '',
      order: order ?? 0,
      lock_conditions: lock_conditions ?? [],
    },
    include: { items: true },
  });

  return NextResponse.json(content);
}