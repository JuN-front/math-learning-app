import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readDB, writeDB, generateId } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const contentId = formData.get('content_id') as string;

  if (!file || !contentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = readDB();
  const content = db.contents.find(c => c.id === contentId);
  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 });

  const ext = file.name.split('.').pop();
  const filename = `assignment-${userId}-${generateId()}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'assignments');

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // Delete old submission if exists
  const existingAssignment = db.assignments.find(a => a.user_id === userId && a.content_id === contentId);
  if (existingAssignment) {
    const oldPath = path.join(process.cwd(), 'public', existingAssignment.file_path);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    db.assignments = db.assignments.filter(a => a.id !== existingAssignment.id);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = `/uploads/assignments/${filename}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);

  const newAssignment = {
    id: `asgn-${generateId()}`,
    user_id: userId,
    content_id: contentId,
    file_path: filePath,
    filename: file.name,
    submitted_at: new Date().toISOString(),
  };

  db.assignments.push(newAssignment);

  // Update progress
  let prog = db.progress.find(p => p.user_id === userId && p.content_id === contentId);
  if (prog) {
    prog.assignment_submitted = true;
    prog.updated_at = new Date().toISOString();
    // Check completion
    const needsVideo = content.has_video && content.video_path;
    const needsTextbook = content.has_textbook && content.textbook_path;
    const videoOk = !needsVideo || prog.video_watched;
    const textbookOk = !needsTextbook || prog.textbook_read;
    if (videoOk && textbookOk) prog.status = 'completed';
  }

  writeDB(db);
  return NextResponse.json(newAssignment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const contentId = searchParams.get('content_id');

  if (!contentId) return NextResponse.json({ error: 'Missing content_id' }, { status: 400 });

  const db = readDB();
  const assignment = db.assignments.find(a => a.user_id === userId && a.content_id === contentId);
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fullPath = path.join(process.cwd(), 'public', assignment.file_path);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  db.assignments = db.assignments.filter(a => a.id !== assignment.id);

  // Update progress
  const prog = db.progress.find(p => p.user_id === userId && p.content_id === contentId);
  if (prog) {
    prog.assignment_submitted = false;
    prog.status = 'in_progress';
    prog.updated_at = new Date().toISOString();
  }

  writeDB(db);
  return NextResponse.json({ success: true });
}
