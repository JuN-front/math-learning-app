import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readDB, writeDB, generateId } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = readDB();
  const units = db.units.sort((a, b) => a.order - b.order);

  // Count completed contents per unit for current user
  const userId = (session.user as any).id;
  const unitsWithProgress = units.map(unit => {
    const unitContents = db.contents.filter(c => c.unit_id === unit.id);
    const completedCount = unitContents.filter(c => {
      const prog = db.progress.find(p => p.user_id === userId && p.content_id === c.id);
      return prog?.status === 'completed';
    }).length;
    return { ...unit, total_contents: unitContents.length, completed_contents: completedCount };
  });

  return NextResponse.json(unitsWithProgress);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const db = readDB();
  const maxOrder = db.units.length > 0 ? Math.max(...db.units.map(u => u.order)) : 0;

  const newUnit = {
    id: `unit-${generateId()}`,
    title: body.title,
    description: body.description || '',
    order: maxOrder + 1,
    created_at: new Date().toISOString(),
  };

  db.units.push(newUnit);
  writeDB(db);

  return NextResponse.json(newUnit, { status: 201 });
}
