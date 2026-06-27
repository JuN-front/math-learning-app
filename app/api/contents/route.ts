import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readDB, writeDB, generateId } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get('unit_id');

  const db = readDB();
  let contents = db.contents;
  if (unitId) contents = contents.filter(c => c.unit_id === unitId);

  return NextResponse.json(contents.sort((a, b) => a.order - b.order));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const db = readDB();
  const unitContents = db.contents.filter(c => c.unit_id === body.unit_id);
  const maxOrder = unitContents.length > 0 ? Math.max(...unitContents.map(c => c.order)) : 0;

  const newContent = {
    id: `content-${generateId()}`,
    unit_id: body.unit_id,
    title: body.title,
    description: body.description || '',
    order: maxOrder + 1,
    has_video: body.has_video || false,
    has_textbook: body.has_textbook || false,
    has_assignment: body.has_assignment || false,
    video_path: null,
    textbook_path: null,
    assignment_path: null,
    answer_path: null,
    lock_conditions: body.lock_conditions || [],
    created_at: new Date().toISOString(),
  };

  db.contents.push(newContent);
  writeDB(db);

  return NextResponse.json(newContent, { status: 201 });
}
