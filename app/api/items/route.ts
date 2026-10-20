import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { content_id, type, label, url, order, unlock_after_item_id, question_id } = await request.json();

  const item = await prisma.contentItem.create({
    data: {
      content_id,
      type,
      label,
      url: url ?? null,
      order: order ?? 0,
      unlock_after_item_id: unlock_after_item_id ?? null,
      question_id: question_id ?? null,
    },
  });

  return NextResponse.json(item);
}