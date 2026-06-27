import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id as string;

  const content = await prisma.content.findUnique({ where: { id } });
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const prog = await prisma.progress.findUnique({
    where: { user_id_content_id: { user_id: userId, content_id: id } },
  });
  const assignment = await prisma.assignment.findUnique({
    where: { user_id_content_id: { user_id: userId, content_id: id } },
  });

  const isLocked = content.lock_conditions.length > 0 && (
    await Promise.all(
      content.lock_conditions.map(async (reqId: string) => {
        const reqProg = await prisma.progress.findUnique({
          where: { user_id_content_id: { user_id: userId, content_id: reqId } },
        });
        return !reqProg || reqProg.status !== 'completed';
      })
    )
  ).some(Boolean);

  return NextResponse.json({ ...content, progress: prog, assignment, is_locked: isLocked });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const content = await prisma.content.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      has_video: body.has_video,
      has_textbook: body.has_textbook,
      has_assignment: body.has_assignment,
      lock_conditions: body.lock_conditions,
    },
  });

  return NextResponse.json(content);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id } });
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  for (const filePath of [content.video_path, content.textbook_path, content.assignment_path, content.answer_path]) {
    if (filePath) {
      const full = path.join(process.cwd(), 'public', filePath);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
  }

  await prisma.content.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
