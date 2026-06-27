import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const contentId = formData.get('content_id') as string;
  const fileType = formData.get('file_type') as string;

  if (!file || !contentId || !fileType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 });

  const ext = file.name.split('.').pop();
  const filename = `${fileType}-${Date.now()}.${ext}`;
  const uploadDir = fileType === 'video' ? 'uploads/videos' : 'uploads/pdfs';
  const fullDir = path.join(process.cwd(), 'public', uploadDir);

  if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });

  // 旧ファイル削除
  const oldPath = (content as any)[`${fileType}_path`] as string | null;
  if (oldPath) {
    const oldFull = path.join(process.cwd(), 'public', oldPath);
    if (fs.existsSync(oldFull)) fs.unlinkSync(oldFull);
  }

  const bytes = await file.arrayBuffer();
  fs.writeFileSync(path.join(fullDir, filename), Buffer.from(bytes));
  const filePath = `/${uploadDir}/${filename}`;

  await prisma.content.update({
    where: { id: contentId },
    data: { [`${fileType}_path`]: filePath },
  });

  return NextResponse.json({ path: filePath });
}
