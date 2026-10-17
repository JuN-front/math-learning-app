import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, personal_id: true, username: true, role: true, created_at: true },
    orderBy: { created_at: 'asc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { personal_id, username, password, role } = await request.json();

  const existing = await prisma.user.findUnique({ where: { personal_id } });
  if (existing) {
    return NextResponse.json({ error: 'このIDは既に使用されています' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { personal_id, username, password: hashed, role: role ?? 'user' },
    select: { id: true, personal_id: true, username: true, role: true, created_at: true },
  });

  return NextResponse.json(user);
}