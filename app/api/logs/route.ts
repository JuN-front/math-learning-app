// app/api/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface IncomingEvent {
  event: string;
  contentId?: string;
  itemId?: string;
  payload?: Record<string, unknown>;
  client_time: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  let body: { events: IncomingEvent[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const events = body.events;
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  await prisma.eventLog.createMany({
    data: events.map(e => ({
      user_id: userId,
      content_id: e.contentId ?? null,
      item_id: e.itemId ?? null,
      event: e.event,
      payload: e.payload ? (e.payload as import('@prisma/client').Prisma.InputJsonValue) : undefined,
      client_time: new Date(e.client_time),
    })),
    skipDuplicates: false,
  });

  return NextResponse.json({ ok: true, count: events.length });
}