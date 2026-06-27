import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readDB, writeDB, generateId } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();
  const db = readDB();

  const content = db.contents.find(c => c.id === id);
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let prog = db.progress.find(p => p.user_id === userId && p.content_id === id);

  if (!prog) {
    prog = {
      id: `prog-${generateId()}`,
      user_id: userId,
      content_id: id,
      status: 'in_progress',
      video_watched: false,
      textbook_read: false,
      assignment_submitted: false,
      updated_at: new Date().toISOString(),
    };
    db.progress.push(prog);
  }

  if (body.video_watched !== undefined) prog.video_watched = body.video_watched;
  if (body.textbook_read !== undefined) prog.textbook_read = body.textbook_read;
  if (body.assignment_submitted !== undefined) prog.assignment_submitted = body.assignment_submitted;
  prog.updated_at = new Date().toISOString();

  const needsVideo = content.has_video && content.video_path;
  const needsTextbook = content.has_textbook && content.textbook_path;
  const needsAssignment = content.has_assignment;

  const videoOk = !needsVideo || prog.video_watched;
  const textbookOk = !needsTextbook || prog.textbook_read;
  const assignmentOk = !needsAssignment || prog.assignment_submitted;

  prog.status = (videoOk && textbookOk && assignmentOk) ? 'completed' : 'in_progress';

  const idx = db.progress.findIndex(p => p.id === prog!.id);
  if (idx >= 0) db.progress[idx] = prog;

  writeDB(db);
  return NextResponse.json(prog);
}
