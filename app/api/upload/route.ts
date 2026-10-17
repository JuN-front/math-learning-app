import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const type = formData.get('type') as string; // 'content_item' | 'submission'
  const itemId = formData.get('itemId') as string | null;
  const contentId = formData.get('contentId') as string | null;

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}-${file.name}`;

  if (type === 'submission') {
    // 生徒の課題提出
    if (!itemId || !contentId) {
      return NextResponse.json({ error: 'itemId and contentId required' }, { status: 400 });
    }
    const userId = session.user.id;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'submissions', userId);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await writeFile(filePath, buffer);
    const relativePath = `/uploads/submissions/${userId}/${filename}`;

    const submission = await prisma.itemSubmission.upsert({
      where: { user_id_item_id: { user_id: userId, item_id: itemId } },
      update: { file_path: relativePath, filename: file.name, submitted_at: new Date() },
      create: {
        user_id: userId,
        content_id: contentId,
        item_id: itemId,
        file_path: relativePath,
        filename: file.name,
      },
    });

    // 課題提出でコンテンツをcompletedに
    await prisma.progress.upsert({
      where: { user_id_content_id: { user_id: userId, content_id: contentId } },
      update: { status: 'completed' },
      create: { user_id: userId, content_id: contentId, status: 'completed' },
    });

    return NextResponse.json({ submission, file_path: relativePath });

  } else if (type === 'content_item') {
    // 管理者がコンテンツアイテムをアップロード
    if (!session.user.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 });

    const itemType = formData.get('itemType') as string; // 'video' | 'pdf'
    const label = formData.get('label') as string;
    const order = parseInt(formData.get('order') as string ?? '0');
    const existingItemId = formData.get('existingItemId') as string | null;

    const dir = path.join(process.cwd(), 'public', 'uploads', 'contents', contentId);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await writeFile(filePath, buffer);
    const relativePath = `/uploads/contents/${contentId}/${filename}`;

    let item;
    if (existingItemId) {
      item = await prisma.contentItem.update({
        where: { id: existingItemId },
        data: { file_path: relativePath },
      });
    } else {
      item = await prisma.contentItem.create({
        data: {
          content_id: contentId,
          type: itemType,
          label,
          file_path: relativePath,
          order,
        },
      });
    }

    return NextResponse.json({ item, file_path: relativePath });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');
  const submissionType = searchParams.get('type');

  if (submissionType === 'submission' && itemId) {
    const userId = session.user.id;
    await prisma.itemSubmission.deleteMany({
      where: { user_id: userId, item_id: itemId },
    });
    return NextResponse.json({ success: true });
  }

  if (submissionType === 'content_item' && itemId) {
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await prisma.contentItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}