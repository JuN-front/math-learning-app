import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orders } = await request.json();
  // orders: [{ id: string, order: number }]

  await Promise.all(
    orders.map(({ id, order }: { id: string; order: number }) =>
      prisma.content.update({ where: { id }, data: { order } })
    )
  );

  return NextResponse.json({ ok: true });
}