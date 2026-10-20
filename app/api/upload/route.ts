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
  const contentId = formData.get('contentId') as string | null;

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const filename = `${Date.now()}-${file.name}`;

  if (type === 'content_item') {
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 });

    const itemType = formData.get('itemType') as string;
    const label = formData.get('label') as string;
    const order = parseInt(formData.get('order') as string ?? '0');
    const existingItemId = formData.get('existingItemId') as string | null;
    const unlock_after_item_id = (formData.get('unlock_after_item_id') as string | null) || null;

    const { url } = await put(`contents/${contentId}/${filename}`, file, { access: 'public' });

    let item;
    if (existingItemId) {
      item = await prisma.contentItem.update({
        where: { id: existingItemId },
        data: { file_path: url, unlock_after_item_id },
      });
    } else {
      item = await prisma.contentItem.create({
        data: {
          content_id: contentId,
          type: itemType,
          label,
          file_path: url,
          order,
          unlock_after_item_id,
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
  const deleteType = searchParams.get('type');

  if (deleteType === 'content_item' && itemId) {
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