import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const unassigned = await prisma.user.findMany({
    where: { group: null, role: 'user' },
    select: { id: true },
    orderBy: { created_at: 'asc' },
  });

  const groups = ['A', 'B', 'C'] as const;
  const counts = await prisma.user.groupBy({
    by: ['group'],
    where: { group: { not: null }, role: 'user' },
    _count: true,
  });
  const countMap: Record<string, number> = { A: 0, B: 0, C: 0 };
  counts.forEach(c => { if (c.group) countMap[c.group] = c._count; });

  const updates: { id: string; group: string }[] = [];
  for (const user of unassigned) {
    const minGroup = groups.reduce((a, b) => (countMap[a] <= countMap[b] ? a : b));
    updates.push({ id: user.id, group: minGroup });
    countMap[minGroup]++;
  }

  await Promise.all(
    updates.map(u => prisma.user.update({ where: { id: u.id }, data: { group: u.group } }))
  );

  return NextResponse.json({ assigned: updates.length, distribution: countMap });
}