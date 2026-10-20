import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { contentId, phase, published } = await request.json();
  await prisma.question.updateMany({
    where: { content_id: contentId, phase },
    data: { published },
  });
  return NextResponse.json({ success: true });
}