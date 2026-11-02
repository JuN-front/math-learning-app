import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/questions?contentId=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 });

  const questions = await prisma.question.findMany({
    where: { content_id: contentId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      content_id: true,
      order: true,
      phase: true,
      body: true,
      file_path: true,
      has_sub_questions: true,
      answer_mode: true,
      allow_attachment: true,
      show_feedback: true,
      published: true,
      level: true,
      set_key: true,
      groups: true,
      created_at: true,
      updated_at: true,
      _count: { select: { sub_questions: true } },
      // NEVER include accepted_answers
    },
  });

  return NextResponse.json({ questions });
}

// POST /api/admin/questions
// type: 'practice' | 'test_set'
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, content_id } = body as { type: string; content_id: string };
  if (!content_id) return NextResponse.json({ error: 'content_id required' }, { status: 400 });

  // ─── Practice question ─────────────────────────────────────────────────────
  if (type === 'practice') {
    const {
      body: questionBody,
      answer_mode = 'staged',
      has_sub_questions = false,
      accepted_answers = [],
      sub_questions = [],
      allow_attachment = false,
      show_feedback = false,
      has_explanation = false,
      exp_understanding = null,
      exp_extraction = null,
      exp_equation = null,
      exp_answer = null,
      exp_check = null,
    } = body as {
      body: string;
      answer_mode?: string;
      has_sub_questions?: boolean;
      accepted_answers?: string[];
      sub_questions?: {
        order: number; body: string; accepted_answers: string[];
        has_explanation?: boolean;
        exp_understanding?: string | null;
        exp_extraction?: string | null;
        exp_equation?: string | null;
        exp_answer?: string | null;
        exp_check?: string | null;
      }[];
      allow_attachment?: boolean;
      show_feedback?: boolean;
      has_explanation?: boolean;
      exp_understanding?: string | null;
      exp_extraction?: string | null;
      exp_equation?: string | null;
      exp_answer?: string | null;
      exp_check?: string | null;
    };

    if (!questionBody) return NextResponse.json({ error: '問題文が必要です' }, { status: 400 });

    if (has_sub_questions && sub_questions.length < 2) {
      return NextResponse.json({ error: '小問は2問以上必要です' }, { status: 400 });
    }

    // Determine next order
    const lastQ = await prisma.question.findFirst({
      where: { content_id, phase: 'practice' },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (lastQ?.order ?? -1) + 1;

    const question = await prisma.question.create({
      data: {
        content_id,
        phase: 'practice',
        order: nextOrder,
        body: questionBody,
        answer_mode,
        has_sub_questions,
        accepted_answers: has_sub_questions ? [] : (accepted_answers as string[]),
        allow_attachment,
        show_feedback,
        published: false,
        has_explanation: has_sub_questions ? false : has_explanation,
        exp_understanding: (!has_sub_questions && has_explanation) ? exp_understanding : null,
        exp_extraction: (!has_sub_questions && has_explanation) ? exp_extraction : null,
        exp_equation: (!has_sub_questions && has_explanation) ? exp_equation : null,
        exp_answer: (!has_sub_questions && has_explanation) ? exp_answer : null,
        exp_check: (!has_sub_questions && has_explanation) ? exp_check : null,
        ...(has_sub_questions
          ? {
              sub_questions: {
                create: (sub_questions as {
                  order: number; body: string; accepted_answers: string[];
                  has_explanation?: boolean;
                  exp_understanding?: string | null;
                  exp_extraction?: string | null;
                  exp_equation?: string | null;
                  exp_answer?: string | null;
                  exp_check?: string | null;
                }[]).map(sq => ({
                  order: sq.order,
                  body: sq.body,
                  accepted_answers: sq.accepted_answers,
                  has_explanation: sq.has_explanation ?? false,
                  exp_understanding: sq.exp_understanding ?? null,
                  exp_extraction: sq.exp_extraction ?? null,
                  exp_equation: sq.exp_equation ?? null,
                  exp_answer: sq.exp_answer ?? null,
                  exp_check: sq.exp_check ?? null,
                })),
              },
            }
          : {}),
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  }

  // ─── Test set (pre/post) ───────────────────────────────────────────────────
  if (type === 'test_set') {
    const {
      phase,
      set_index,
      questions: testQuestions,
      answer_mode = 'staged',
      allow_attachment = false,
      show_feedback = false,
    } = body as {
      phase: string;
      set_index: number;
      questions: {
        group: string; level: string; body: string;
        has_sub_questions?: boolean;
        accepted_answers: string[];
        sub_questions?: { order: number; body: string; accepted_answers: string[] }[];
      }[];
      answer_mode?: string;
      allow_attachment?: boolean;
      show_feedback?: boolean;
    };

    if (!phase || !testQuestions || !Array.isArray(testQuestions)) {
      return NextResponse.json({ error: 'phase and questions required' }, { status: 400 });
    }

    const setKey = `${content_id}_${phase}_set${set_index}`;

    const lastQ = await prisma.question.findFirst({
      where: { content_id, phase },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const baseOrder = (lastQ?.order ?? -1) + 1;

    const created = await prisma.$transaction(
      testQuestions.map((q, i) => {
        const hasSub = q.has_sub_questions ?? false;
        return prisma.question.create({
          data: {
            content_id,
            phase,
            order: baseOrder + i,
            body: q.body,
            answer_mode,
            has_sub_questions: hasSub,
            accepted_answers: hasSub ? [] : q.accepted_answers,
            allow_attachment,
            show_feedback,
            published: false,
            level: q.level,
            set_key: setKey,
            groups: [q.group],
            ...(hasSub && q.sub_questions ? {
              sub_questions: {
                create: q.sub_questions.map(sq => ({
                  order: sq.order, body: sq.body, accepted_answers: sq.accepted_answers,
                })),
              },
            } : {}),
          },
        });
      })
    );

    return NextResponse.json({ questions: created }, { status: 201 });
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}