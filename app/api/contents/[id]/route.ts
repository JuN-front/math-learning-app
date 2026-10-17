import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const content = await prisma.content.findUnique({
    where: { id },
    include: { items: { orderBy: { order: 'asc' } } },
  });

  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(content);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { title, description, order, lock_conditions } = await request.json();

  const content = await prisma.content.update({
    where: { id },
    data: { title, description, order, lock_conditions },
    include: { items: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json(content);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  await prisma.content.delete({ where: { id } });

  return NextResponse.json({ success: true });
}