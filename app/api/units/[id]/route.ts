import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readDB, writeDB } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = readDB();
  const unit = db.units.find(u => u.id === id);
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const userId = (session.user as any).id;
  const contents = db.contents
    .filter(c => c.unit_id === id)
    .sort((a, b) => a.order - b.order)
    .map(c => {
      const prog = db.progress.find(p => p.user_id === userId && p.content_id === c.id);
      const status = prog?.status || 'not_started';
      const isLocked = c.lock_conditions.some(reqId => {
        const reqProg = db.progress.find(p => p.user_id === userId && p.content_id === reqId);
        return !reqProg || reqProg.status !== 'completed';
      });
      return { ...c, status, is_locked: isLocked, progress: prog || null };
    });

  return NextResponse.json({ unit, contents });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const db = readDB();
  const idx = db.units.findIndex(u => u.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.units[idx] = { ...db.units[idx], ...body };
  writeDB(db);
  return NextResponse.json(db.units[idx]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = readDB();
  db.units = db.units.filter(u => u.id !== id);
  db.contents = db.contents.filter(c => c.unit_id !== id);
  writeDB(db);
  return NextResponse.json({ success: true });
}
