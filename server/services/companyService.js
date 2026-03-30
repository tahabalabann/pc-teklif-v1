import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { assertOwnedByRecordOwnerOrThrow, getOwnerScopedRow } from "./common.js";

export async function listCompaniesForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT c."data" AS "data"
      FROM "CompanyDirectoryEntry" c
      JOIN "User" u ON u."id" = c."ownerUserId"
      WHERE u."companyId" = ${user.companyId}
      ORDER BY c."updatedAt" DESC
    `,
  );

  return rows.map((row) => JSON.parse(row.data));
}

export async function saveCompanyForUser(user, company) {
  const now = new Date().toISOString();
  const id = company.id || randomUUID();
  const payload = {
    ...company,
    id,
    createdAt: company.createdAt || now,
    updatedAt: now,
  };

  await assertOwnedByRecordOwnerOrThrow("CompanyDirectoryEntry", payload.id, user, "Bu firma kaydı başka bir firmaya ait.");

  const existingRows = await prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "CompanyDirectoryEntry" WHERE "id" = ${payload.id} LIMIT 1`);
  if (existingRows[0]) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "CompanyDirectoryEntry"
        SET "data" = ${JSON.stringify(payload)}, "updatedAt" = ${payload.updatedAt}
        WHERE "id" = ${payload.id}
      `
    );
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "CompanyDirectoryEntry" ("id", "ownerUserId", "data", "createdAt", "updatedAt")
        VALUES (${payload.id}, ${user.id}, ${JSON.stringify(payload)}, ${payload.createdAt}, ${payload.updatedAt})
      `
    );
  }

  return payload;
}

export async function deleteCompanyForUser(user, companyId) {
  const row = await getOwnerScopedRow("CompanyDirectoryEntry", companyId);
  if (!row || row.companyId !== user.companyId) return;
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "CompanyDirectoryEntry" WHERE "id" = ${companyId}`);
}
