import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readDB, writeDB, generateId } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = readDB();
  const users = db.users.map(({ password, ...u }) => u);
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { username, personal_id, password, role } = body;

  if (!username || !personal_id || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = readDB();
  if (db.users.find(u => u.personal_id === personal_id)) {
    return NextResponse.json({ error: 'ID already exists' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: `user-${generateId()}`,
    personal_id,
    username,
    password: hashedPassword,
    role: role as 'admin' | 'user',
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDB(db);

  const { password: _, ...userWithoutPassword } = newUser;
  return NextResponse.json(userWithoutPassword, { status: 201 });
}
