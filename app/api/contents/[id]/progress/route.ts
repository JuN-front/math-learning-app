import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: contentId } = await params;
  const userId = session.user.id;

  const progress = await prisma.progress.findUnique({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
  });

  return NextResponse.json({ progress });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: contentId } = await params;
  const userId = session.user.id;
  const { status, clicked_items } = await request.json();

  // Store clicked_items in a separate EventLog payload or just update progress status
  // We use the Progress model with status only; clicked_items are tracked via EventLog
  const progress = await prisma.progress.upsert({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
    update: { status },
    create: { user_id: userId, content_id: contentId, status },
  });

  // If clicked_items provided, log them for record-keeping
  if (Array.isArray(clicked_items) && clicked_items.length > 0) {
    // Already logged individually via /api/logs on each click
    // This is just for completeness
  }

  return NextResponse.json(progress);
}