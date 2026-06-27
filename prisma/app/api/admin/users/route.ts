import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, personal_id: true, username: true, role: true, created_at: true },
    orderBy: { created_at: 'asc' },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { username, personal_id, password, role } = await req.json();
  if (!username || !personal_id || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { personal_id } });
  if (exists) return NextResponse.json({ error: 'ID already exists' }, { status: 409 });

  const user = await prisma.user.create({
    data: { username, personal_id, password: await bcrypt.hash(password, 10), role },
    select: { id: true, personal_id: true, username: true, role: true, created_at: true },
  });

  return NextResponse.json(user, { status: 201 });
}
