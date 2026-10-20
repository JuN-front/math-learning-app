import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');
  const phase = searchParams.get('phase');

  const responses = await prisma.questionResponse.findMany({
    where: {
      ...(contentId ? { question: { content_id: contentId } } : {}),
      ...(phase ? { question: { phase } } : {}),
    },
    include: {
      user: { select: { personal_id: true } },
      question: { select: { phase: true, level: true, set_key: true } },
    },
    orderBy: [{ user_id: 'asc' }, { question_id: 'asc' }, { attempt: 'asc' }],
    take: 50000,
  });

  const header = [
    'personal_id','group','question_id','phase','level','set_key',
    'attempt','understanding','extraction','equation','answer','check',
    'attachment_url','is_correct','is_correct_override',
    'started_at','submitted_at','duration_sec',
  ];
  const rows = responses.map(r => {
    const duration = Math.round((r.submitted_at.getTime() - r.started_at.getTime()) / 1000);
    return [
      r.user.personal_id, r.group ?? '', r.question_id,
      r.question.phase, r.question.level ?? '', r.question.set_key ?? '',
      r.attempt, r.understanding ?? '', r.extraction ?? '',
      r.equation ?? '', r.answer, r.check ?? '',
      r.attachment_url ?? '', r.is_correct, r.is_correct_override ?? '',
      r.started_at.toISOString(), r.submitted_at.toISOString(), duration,
    ];
  });

  const csv = [header, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="responses_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}