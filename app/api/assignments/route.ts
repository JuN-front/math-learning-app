import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id as string;
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const contentId = formData.get('content_id') as string;

  if (!file || !contentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 });

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'assignments');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // 既存の提出ファイルを削除
  const existing = await prisma.assignment.findUnique({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
  });
  if (existing) {
    const oldFull = path.join(process.cwd(), 'public', existing.file_path);
    if (fs.existsSync(oldFull)) fs.unlinkSync(oldFull);
    await prisma.assignment.delete({
      where: { user_id_content_id: { user_id: userId, content_id: contentId } },
    });
  }

  const ext = file.name.split('.').pop();
  const filename = `assignment-${userId}-${Date.now()}.${ext}`;
  const filePath = `/uploads/assignments/${filename}`;
  fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  const assignment = await prisma.assignment.create({
    data: { user_id: userId, content_id: contentId, file_path: filePath, filename: file.name },
  });

  // 進捗更新
  const prog = await prisma.progress.findUnique({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
  });
  const needsVideo = content.has_video && content.video_path;
  const needsTextbook = content.has_textbook && content.textbook_path;
  const videoOk = !needsVideo || prog?.video_watched;
  const textbookOk = !needsTextbook || prog?.textbook_read;
  const status = videoOk && textbookOk ? 'completed' : 'in_progress';

  await prisma.progress.upsert({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
    create: { user_id: userId, content_id: contentId, status, assignment_submitted: true },
    update: { assignment_submitted: true, status },
  });

  return NextResponse.json(assignment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { searchParams } = new URL(req.url);
  const contentId = searchParams.get('content_id');
  if (!contentId) return NextResponse.json({ error: 'Missing content_id' }, { status: 400 });

  const assignment = await prisma.assignment.findUnique({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
  });
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fullPath = path.join(process.cwd(), 'public', assignment.file_path);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  await prisma.assignment.delete({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
  });
  await prisma.progress.update({
    where: { user_id_content_id: { user_id: userId, content_id: contentId } },
    data: { assignment_submitted: false, status: 'in_progress' },
  });

  return NextResponse.json({ success: true });
}
