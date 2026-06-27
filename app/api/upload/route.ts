import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readDB, writeDB, generateId } from '@/lib/db';
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
  const fileType = formData.get('file_type') as string; // 'video' | 'textbook' | 'assignment' | 'answer'

  if (!file || !contentId || !fileType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = readDB();
  const content = db.contents.find(c => c.id === contentId);
  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 });

  const ext = file.name.split('.').pop();
  const filename = `${fileType}-${generateId()}.${ext}`;

  let uploadDir = '';
  if (fileType === 'video') uploadDir = 'uploads/videos';
  else if (fileType === 'textbook' || fileType === 'assignment' || fileType === 'answer') uploadDir = 'uploads/pdfs';
  else return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });

  const fullDir = path.join(process.cwd(), 'public', uploadDir);
  if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = `/${uploadDir}/${filename}`;

  fs.writeFileSync(path.join(fullDir, filename), buffer);

  // Delete old file if exists
  const oldPathKey = `${fileType}_path` as keyof typeof content;
  const oldPath = content[oldPathKey] as string | null;
  if (oldPath) {
    const oldFullPath = path.join(process.cwd(), 'public', oldPath);
    if (fs.existsSync(oldFullPath)) fs.unlinkSync(oldFullPath);
  }

  const idx = db.contents.findIndex(c => c.id === contentId);
  (db.contents[idx] as any)[`${fileType}_path`] = filePath;
  writeDB(db);

  return NextResponse.json({ path: filePath });
}
