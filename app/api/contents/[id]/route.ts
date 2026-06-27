import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readDB, writeDB } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = readDB();
  const content = db.contents.find(c => c.id === id);
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const userId = (session.user as any).id;
  const prog = db.progress.find(p => p.user_id === userId && p.content_id === id);
  const assignment = db.assignments.find(a => a.user_id === userId && a.content_id === id);

  const isLocked = content.lock_conditions.some(reqId => {
    const reqProg = db.progress.find(p => p.user_id === userId && p.content_id === reqId);
    return !reqProg || reqProg.status !== 'completed';
  });

  return NextResponse.json({ ...content, progress: prog || null, assignment: assignment || null, is_locked: isLocked });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const db = readDB();
  const idx = db.contents.findIndex(c => c.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.contents[idx] = { ...db.contents[idx], ...body };
  writeDB(db);
  return NextResponse.json(db.contents[idx]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = readDB();
  const content = db.contents.find(c => c.id === id);
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filesToDelete = [content.video_path, content.textbook_path, content.assignment_path, content.answer_path];
  for (const f of filesToDelete) {
    if (f) {
      const fullPath = path.join(process.cwd(), 'public', f);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
  }

  db.contents = db.contents.filter(c => c.id !== id);
  db.progress = db.progress.filter(p => p.content_id !== id);
  db.assignments = db.assignments.filter(a => a.content_id !== id);
  writeDB(db);
  return NextResponse.json({ success: true });
}
