import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/admin/questions/publish
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { contentId: string; phase: string; published: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { contentId, phase, published } = body;
  if (!contentId || !phase) return NextResponse.json({ error: 'contentId and phase required' }, { status: 400 });

  await prisma.question.updateMany({
    where: { content_id: contentId, phase },
    data: { published },
  });

  return NextResponse.json({ ok: true });
}