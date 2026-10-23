import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// PATCH /api/admin/questions/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.published === 'boolean') data.published = body.published;
  if (typeof body.body === 'string') data.body = body.body;
  if (typeof body.answer_mode === 'string') data.answer_mode = body.answer_mode;
  if (typeof body.allow_attachment === 'boolean') data.allow_attachment = body.allow_attachment;
  if (typeof body.show_feedback === 'boolean') data.show_feedback = body.show_feedback;

  const question = await prisma.question.update({ where: { id }, data });
  return NextResponse.json({ question });
}

// DELETE /api/admin/questions/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}