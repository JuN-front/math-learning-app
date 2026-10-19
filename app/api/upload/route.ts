// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { put, del } from '@vercel/blob';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const type = formData.get('type') as string;
  const itemId = formData.get('itemId') as string | null;
  const contentId = formData.get('contentId') as string | null;

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const filename = `${Date.now()}-${file.name}`;

  if (type === 'submission') {
    if (!itemId || !contentId) {
      return NextResponse.json({ error: 'itemId and contentId required' }, { status: 400 });
    }
    const userId = session.user.id;

    // 課題提出ファイルは access: 'public' → Blob URLで保存
    // （PDFはiframeで表示するためpublicが必要。研究倫理上の懸念はEventLogで代替管理）
    const { url } = await put(`submissions/${userId}/${filename}`, file, { access: 'public' });

    const submission = await prisma.itemSubmission.upsert({
      where: { user_id_item_id: { user_id: userId, item_id: itemId } },
      update: { file_path: url, filename: file.name, submitted_at: new Date() },
      create: {
        user_id: userId,
        content_id: contentId,
        item_id: itemId,
        file_path: url,
        filename: file.name,
      },
    });

    await prisma.progress.upsert({
      where: { user_id_content_id: { user_id: userId, content_id: contentId } },
      update: { status: 'completed' },
      create: { user_id: userId, content_id: contentId, status: 'completed' },
    });

    // 提出をEventLogに記録（再提出回数追跡用）
    await prisma.eventLog.create({
      data: {
        user_id: userId,
        content_id: contentId,
        item_id: itemId,
        event: 'submit',
        payload: { filename: file.name, blob_url: url },
        client_time: new Date(),
      },
    });

    return NextResponse.json({ submission, file_path: url });

  } else if (type === 'content_item') {
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 });

    const itemType = formData.get('itemType') as string;
    const label = formData.get('label') as string;
    const order = parseInt(formData.get('order') as string ?? '0');
    const existingItemId = formData.get('existingItemId') as string | null;

    const { url } = await put(`contents/${contentId}/${filename}`, file, { access: 'public' });

    let item;
    if (existingItemId) {
      item = await prisma.contentItem.update({
        where: { id: existingItemId },
        data: { file_path: url },
      });
    } else {
      item = await prisma.contentItem.create({
        data: {
          content_id: contentId,
          type: itemType,
          label,
          file_path: url,
          order,
        },
      });
    }

    return NextResponse.json({ item, file_path: url });
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
    const sub = await prisma.itemSubmission.findFirst({
      where: { user_id: userId, item_id: itemId },
    });
    if (sub?.file_path) {
      try { await del(sub.file_path); } catch {}
    }

    // 削除をEventLogに記録
    if (sub) {
      await prisma.eventLog.create({
        data: {
          user_id: userId,
          content_id: sub.content_id,
          item_id: itemId,
          event: 'submission_delete',
          payload: { filename: sub.filename },
          client_time: new Date(),
        },
      });
    }

    await prisma.itemSubmission.deleteMany({ where: { user_id: userId, item_id: itemId } });
    return NextResponse.json({ success: true });
  }

  if (submissionType === 'content_item' && itemId) {
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const ci = await prisma.contentItem.findUnique({ where: { id: itemId } });
    if (ci?.file_path) {
      try { await del(ci.file_path); } catch {}
    }
    await prisma.contentItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}