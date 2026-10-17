import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get('unitId');

  const where: { user_id: string; content?: { unit_id: string } } = { user_id: userId };
  if (unitId) where.content = { unit_id: unitId };

  const progresses = await prisma.progress.findMany({ where });

  // { content_id: status } の形で返す
  const map: Record<string, string> = {};
  for (const p of progresses) map[p.content_id] = p.status;

  return NextResponse.json(map);
}