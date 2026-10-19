// app/api/admin/logs/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const contentId = searchParams.get('contentId');

  const where: {
    created_at?: { gte?: Date; lte?: Date };
    content_id?: string;
  } = {};

  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.created_at.lte = toDate;
    }
  }
  if (contentId) where.content_id = contentId;

  const logs = await prisma.eventLog.findMany({
    where,
    include: { user: { select: { personal_id: true } } },
    orderBy: { client_time: 'asc' },
    take: 50000, // 上限
  });

  const header = ['personal_id', 'content_id', 'item_id', 'event', 'payload', 'client_time', 'created_at'];
  const rows = logs.map(log => [
    log.user.personal_id,
    log.content_id ?? '',
    log.item_id ?? '',
    log.event,
    log.payload ? JSON.stringify(log.payload) : '',
    log.client_time.toISOString(),
    log.created_at.toISOString(),
  ]);

  const csv = [header, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="event_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}