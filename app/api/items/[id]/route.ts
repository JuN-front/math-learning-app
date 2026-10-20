import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { type, label, url, order, unlock_after_item_id, question_id } = await request.json();

  const item = await prisma.contentItem.update({
    where: { id },
    data: {
      type,
      label,
      url: url ?? null,
      order,
      unlock_after_item_id: unlock_after_item_id ?? null,
      question_id: question_id ?? null,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  await prisma.contentItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}