/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  const adminPass = await bcrypt.hash('admin123', 10);
  const s1Pass = await bcrypt.hash('student123', 10);
  const s2Pass = await bcrypt.hash('student456', 10);

  await prisma.user.upsert({
    where: { personal_id: 'admin' },
    update: {},
    create: { personal_id: 'admin', username: '管理者', password: adminPass, role: 'admin' },
  });
  await prisma.user.upsert({
    where: { personal_id: 'student01' },
    update: {},
    create: { personal_id: 'student01', username: '山田 太郎', password: s1Pass, role: 'user' },
  });
  await prisma.user.upsert({
    where: { personal_id: 'student02' },
    update: {},
    create: { personal_id: 'student02', username: '鈴木 花子', password: s2Pass, role: 'user' },
  });

  const unit1 = await prisma.unit.upsert({
    where: { id: 'unit-seed-001' },
    update: {},
    create: { id: 'unit-seed-001', title: '二次関数', description: '二次関数の基本的な性質と応用を学習します', order: 1 },
  });
  const unit2 = await prisma.unit.upsert({
    where: { id: 'unit-seed-002' },
    update: {},
    create: { id: 'unit-seed-002', title: '三角関数', description: '三角比と三角関数の基礎から応用まで学習します', order: 2 },
  });

  const c1 = await prisma.content.upsert({
    where: { id: 'content-seed-001' },
    update: {},
    create: {
      id: 'content-seed-001', unit_id: unit1.id,
      title: '二次関数とは', description: '二次関数の定義と基本的な形を学びます',
      order: 1, has_video: true, has_textbook: true,
    },
  });
  await prisma.content.upsert({
    where: { id: 'content-seed-002' },
    update: {},
    create: {
      id: 'content-seed-002', unit_id: unit1.id,
      title: 'グラフの描き方', description: '頂点・軸・開口方向を理解してグラフを描きます',
      order: 2, has_video: true, has_textbook: true, has_assignment: true,
      lock_conditions: [c1.id],
    },
  });
  await prisma.content.upsert({
    where: { id: 'content-seed-003' },
    update: {},
    create: {
      id: 'content-seed-003', unit_id: unit2.id,
      title: '三角比の定義', description: 'sin・cos・tanの定義と基本的な値を学びます',
      order: 1, has_video: true, has_textbook: true,
    },
  });

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
