/* eslint-disable @typescript-eslint/no-explicit-any */

// グローバルキャッシュ（開発時のホットリロード対策）
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: any;
}

let _prisma: any = globalThis.prismaGlobal;

export function getPrisma(): any {
  if (!_prisma) {
    // Vercelビルド後（prisma generateで生成済み）に読み込む
    const mod = require('@prisma/client');
    const Client = mod.PrismaClient ?? mod.default?.PrismaClient;
    _prisma = new Client();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.prismaGlobal = _prisma;
    }
  }
  return _prisma;
}

// 後方互換のためのexport
export const prisma = new Proxy({} as any, {
  get(_target, prop) {
    return getPrisma()[prop];
  },
});
