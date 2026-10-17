import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { username, password, role } = await request.json();

  const data: { username?: string; password?: string; role?: string } = {};
  if (username) data.username = username;
  if (role) data.role = role;
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, personal_id: true, username: true, role: true, created_at: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: '自分自身は削除できません' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}