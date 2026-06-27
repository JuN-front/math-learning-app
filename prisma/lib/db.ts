/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: any;
}

// PrismaClientのlazy初期化（ビルド時には評価しない）
let _client: any = null;

export const prisma = new Proxy({} as any, {
  get(_target, prop: string) {
    if (!_client) {
      if (!globalThis.prismaGlobal) {
        const { PrismaClient } = require('@prisma/client');
        globalThis.prismaGlobal = new PrismaClient({
          datasources: { db: { url: process.env.DATABASE_URL } },
        });
      }
      _client = globalThis.prismaGlobal;
    }
    const value = _client[prop];
    return typeof value === 'function' ? value.bind(_client) : value;
  },
});
