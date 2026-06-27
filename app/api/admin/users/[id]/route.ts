import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readDB, writeDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = readDB();
  db.users = db.users.filter(u => u.id !== id);
  db.progress = db.progress.filter(p => p.user_id !== id);
  db.assignments = db.assignments.filter(a => a.user_id !== id);
  writeDB(db);
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.password) {
    body.password = await bcrypt.hash(body.password, 10);
  }

  db.users[idx] = { ...db.users[idx], ...body };
  writeDB(db);

  const { password, ...userWithoutPassword } = db.users[idx];
  return NextResponse.json(userWithoutPassword);
}
