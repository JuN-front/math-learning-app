import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id as string;
  const body = await req.json();

  const content = await prisma.content.findUnique({ where: { id } });
  if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existing = await prisma.progress.findUnique({
    where: { user_id_content_id: { user_id: userId, content_id: id } },
  });

  const updatedData = {
    video_watched: body.video_watched ?? existing?.video_watched ?? false,
    textbook_read: body.textbook_read ?? existing?.textbook_read ?? false,
    assignment_submitted: body.assignment_submitted ?? existing?.assignment_submitted ?? false,
  };

  const needsVideo = content.has_video && content.video_path;
  const needsTextbook = content.has_textbook && content.textbook_path;
  const needsAssignment = content.has_assignment;

  const videoOk = !needsVideo || updatedData.video_watched;
  const textbookOk = !needsTextbook || updatedData.textbook_read;
  const assignmentOk = !needsAssignment || updatedData.assignment_submitted;
  const status = videoOk && textbookOk && assignmentOk ? 'completed' : 'in_progress';

  const progress = await prisma.progress.upsert({
    where: { user_id_content_id: { user_id: userId, content_id: id } },
    create: { user_id: userId, content_id: id, status, ...updatedData },
    update: { status, ...updatedData },
  });

  return NextResponse.json(progress);
}
