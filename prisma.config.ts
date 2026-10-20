import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// .envの場合は↓
// dotenv.config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});