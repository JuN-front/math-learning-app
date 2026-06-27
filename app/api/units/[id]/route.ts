import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id as string;

  const unit = await prisma.unit.findUnique({ where: { id: params.id } });
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const contents = await prisma.content.findMany({
    where: { unit_id: params.id },
    orderBy: { order: 'asc' },
  });

  const contentsWithStatus = await Promise.all(contents.map(async (c) => {
    const prog = await prisma.progress.findUnique({
      where: { user_id_content_id: { user_id: userId, content_id: c.id } },
    });

    // ロック判定
    const isLocked = c.lock_conditions.length > 0 && (
      await Promise.all(
        c.lock_conditions.map(async (reqId) => {
          const reqProg = await prisma.progress.findUnique({
            where: { user_id_content_id: { user_id: userId, content_id: reqId } },
          });
          return !reqProg || reqProg.status !== 'completed';
        })
      )
    ).some(Boolean);

    return {
      ...c,
      status: prog?.status ?? 'not_started',
      is_locked: isLocked,
      progress: prog,
    };
  }));

  return NextResponse.json({ unit, contents: contentsWithStatus });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const unit = await prisma.unit.update({
    where: { id: params.id },
    data: { title: body.title, description: body.description },
  });

  return NextResponse.json(unit);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.unit.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
