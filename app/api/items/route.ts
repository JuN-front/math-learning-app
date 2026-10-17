import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { content_id, type, label, url, order } = await request.json();

  const item = await prisma.contentItem.create({
    data: { content_id, type, label, url: url ?? null, order: order ?? 0 },
  });

  return NextResponse.json(item);
}