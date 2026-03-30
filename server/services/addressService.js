import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { assertOwnedByRecordOwnerOrThrow, getOwnerScopedRow } from "./common.js";

export async function listAddressBookForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT a."id", a."label", a."data", a."createdAt", a."updatedAt"
      FROM "AddressBookEntry" a
      JOIN "User" u ON u."id" = a."ownerUserId"
      WHERE u."companyId" = ${user.companyId}
      ORDER BY a."updatedAt" DESC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    recipient: JSON.parse(row.data),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function saveAddressBookEntryForUser(user, entry) {
  const now = new Date().toISOString();
  const id = entry.id || randomUUID();
  const payload = {
    id,
    ownerUserId: user.id,
    label: entry.label,
    recipient: entry.recipient,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };

  await assertOwnedByRecordOwnerOrThrow("AddressBookEntry", payload.id, user, "Bu adres kaydı başka bir firmaya ait.");

  const existingRows = await prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "AddressBookEntry" WHERE "id" = ${payload.id} LIMIT 1`);
  if (existingRows[0]) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "AddressBookEntry"
        SET "label" = ${payload.label}, "data" = ${JSON.stringify(payload.recipient)}, "updatedAt" = ${payload.updatedAt}
        WHERE "id" = ${payload.id}
      `
    );
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "AddressBookEntry" ("id", "ownerUserId", "label", "data", "createdAt", "updatedAt")
        VALUES (${payload.id}, ${payload.ownerUserId}, ${payload.label}, ${JSON.stringify(payload.recipient)}, ${payload.createdAt}, ${payload.updatedAt})
      `
    );
  }

  return {
    id: payload.id,
    label: payload.label,
    recipient: payload.recipient,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}

export async function deleteAddressBookEntryForUser(user, addressId) {
  const row = await getOwnerScopedRow("AddressBookEntry", addressId);
  if (!row || row.companyId !== user.companyId) return;
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "AddressBookEntry" WHERE "id" = ${addressId}`);
}

export async function listSenderAddressBookForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT a."id", a."label", a."data", a."createdAt", a."updatedAt"
      FROM "SenderAddressBookEntry" a
      JOIN "User" u ON u."id" = a."ownerUserId"
      WHERE u."companyId" = ${user.companyId}
      ORDER BY a."updatedAt" DESC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    recipient: JSON.parse(row.data),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function saveSenderAddressBookEntryForUser(user, entry) {
  const now = new Date().toISOString();
  const id = entry.id || randomUUID();
  const payload = {
    id,
    ownerUserId: user.id,
    label: entry.label,
    recipient: entry.recipient,
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };

  await assertOwnedByRecordOwnerOrThrow("SenderAddressBookEntry", payload.id, user, "Bu gönderici adresi başka bir firmaya ait.");

  const existingRows = await prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "SenderAddressBookEntry" WHERE "id" = ${payload.id} LIMIT 1`);
  if (existingRows[0]) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "SenderAddressBookEntry"
        SET "label" = ${payload.label}, "data" = ${JSON.stringify(payload.recipient)}, "updatedAt" = ${payload.updatedAt}
        WHERE "id" = ${payload.id}
      `
    );
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "SenderAddressBookEntry" ("id", "ownerUserId", "label", "data", "createdAt", "updatedAt")
        VALUES (${payload.id}, ${payload.ownerUserId}, ${payload.label}, ${JSON.stringify(payload.recipient)}, ${payload.createdAt}, ${payload.updatedAt})
      `
    );
  }

  return {
    id: payload.id,
    label: payload.label,
    recipient: payload.recipient,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}

export async function deleteSenderAddressBookEntryForUser(user, addressId) {
  const row = await getOwnerScopedRow("SenderAddressBookEntry", addressId);
  if (!row || row.companyId !== user.companyId) return;
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "SenderAddressBookEntry" WHERE "id" = ${addressId}`);
}
