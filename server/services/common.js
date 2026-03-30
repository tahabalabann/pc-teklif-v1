import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

export const ownerScopedTables = new Set([
  "Quote",
  "AddressBookEntry",
  "SenderAddressBookEntry",
  "CompanyDirectoryEntry",
  "ShipmentRecord",
  "ProductCatalogEntry",
  "Notification",
]);

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
    companyId: row.companyId,
    companyName: row.companyName || "",
    balance: Number(row.balance || 0),
    isPlatformAdmin: Boolean(row.isPlatformAdmin || 0),
    isActive: Boolean(row.isActive ?? 1),
  };
}

export function publicOrganization(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyName: row.name || "",
    logoUrl: row.logoUrl || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    sellerInfo: row.sellerInfo || "",
    paymentAccountName: row.paymentAccountName || "",
    paymentIban: row.paymentIban || "",
    notes: row.notes || "",
    createdAt: row.createdAt,
    isActive: Boolean(row.isActive ?? 1),
  };
}

export async function getOwnerScopedRow(tableName, recordId) {
  if (!ownerScopedTables.has(tableName)) {
    throw new Error(`Unsupported owner-scoped table: ${tableName}`);
  }

  const queryMap = {
    Quote: () => prisma.$queryRaw(Prisma.sql`SELECT t."ownerUserId", u."companyId" FROM "Quote" t JOIN "User" u ON u."id" = t."ownerUserId" WHERE t."id" = ${recordId} LIMIT 1`),
    AddressBookEntry: () => prisma.$queryRaw(Prisma.sql`SELECT t."ownerUserId", u."companyId" FROM "AddressBookEntry" t JOIN "User" u ON u."id" = t."ownerUserId" WHERE t."id" = ${recordId} LIMIT 1`),
    SenderAddressBookEntry: () => prisma.$queryRaw(Prisma.sql`SELECT t."ownerUserId", u."companyId" FROM "SenderAddressBookEntry" t JOIN "User" u ON u."id" = t."ownerUserId" WHERE t."id" = ${recordId} LIMIT 1`),
    CompanyDirectoryEntry: () => prisma.$queryRaw(Prisma.sql`SELECT t."ownerUserId", u."companyId" FROM "CompanyDirectoryEntry" t JOIN "User" u ON u."id" = t."ownerUserId" WHERE t."id" = ${recordId} LIMIT 1`),
    ShipmentRecord: () => prisma.$queryRaw(Prisma.sql`SELECT t."ownerUserId", u."companyId" FROM "ShipmentRecord" t JOIN "User" u ON u."id" = t."ownerUserId" WHERE t."id" = ${recordId} LIMIT 1`),
    ProductCatalogEntry: () => prisma.$queryRaw(Prisma.sql`SELECT t."ownerUserId", u."companyId" FROM "ProductCatalogEntry" t JOIN "User" u ON u."id" = t."ownerUserId" WHERE t."id" = ${recordId} LIMIT 1`),
    Notification: () => prisma.$queryRaw(Prisma.sql`SELECT t."ownerUserId", u."companyId" FROM "Notification" t JOIN "User" u ON u."id" = t."ownerUserId" WHERE t."id" = ${recordId} LIMIT 1`),
  };

  const queryFn = queryMap[tableName];
  if (!queryFn) {
    throw new Error(`No query defined for owner-scoped table: ${tableName}`);
  }

  const rows = await queryFn();
  return rows[0] || null;
}

export async function assertOwnedByRecordOwnerOrThrow(tableName, recordId, user, message) {
  const row = await getOwnerScopedRow(tableName, recordId);
  if (!row) return;
  
  if (user.isPlatformAdmin) return;
  
  if (user.companyId) {
    if (row.companyId !== user.companyId) throw new Error(message);
  } else {
    if (row.ownerUserId !== user.id) throw new Error(message);
  }
}
