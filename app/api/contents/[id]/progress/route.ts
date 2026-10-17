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

  // 提出済みアイテム一覧も返す
  const submissions = await prisma.itemSubmission.findMany({
    where: { user_id: userId, content_id: contentId },
  });

  return NextResponse.json({ progress, submissions });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: contentId } = await params;
  const userId = session.user.id;
  const { status } = await request.json();

  const progress = await prisma.progress.upsert({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
    update: { status },
    create: { user_id: userId, content_id: contentId, status },
  });

  return NextResponse.json(progress);
}