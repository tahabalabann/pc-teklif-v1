"use strict";
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function run() {
  const allQuotes = await prisma.$queryRaw(Prisma.sql`
    SELECT q."id", q."ownerUserId", u."companyId" as "creatorCompanyId", q."data" LIKE '%"quoteNo":"PC-753289"%' as "is75", q."data" LIKE '%"quoteNo":"PC-417988"%' as "is41"
    FROM "Quote" q
    JOIN "User" u ON u."id" = q."ownerUserId"
  `);
  const targetQuotes = allQuotes.filter(q => q.is75 || q.is41);
  const tahaId = await prisma.$queryRaw(Prisma.sql`SELECT "id", "email", "companyId", "role" FROM "User" WHERE "name" LIKE '%Taha%'`);
  
  fs.writeFileSync('test-output.txt', JSON.stringify({ targetQuotes, tahaId }, null, 2), 'utf-8');
}
run().catch(console.error).finally(() => prisma.$disconnect());
