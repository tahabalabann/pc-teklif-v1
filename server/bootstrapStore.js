import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { hashPassword } from "./services/authService.js";

async function ensureColumn(tableName, columnName, columnType, defaultValue) {
  const result = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    tableName,
    columnName,
  );
  const exists = Array.isArray(result) && result.length > 0;
  if (!exists) {
    const defaultClause = defaultValue !== undefined ? ` DEFAULT ${defaultValue}` : "";
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${columnName}" ${columnType}${defaultClause}`,
    );
  }
}

async function ensureSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Organization" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );
  `);

  await ensureColumn("Organization", "logoUrl", "TEXT");
  await ensureColumn("Organization", "phone", "TEXT");
  await ensureColumn("Organization", "email", "TEXT");
  await ensureColumn("Organization", "address", "TEXT");
  await ensureColumn("Organization", "sellerInfo", "TEXT");
  await ensureColumn("Organization", "paymentAccountName", "TEXT");
  await ensureColumn("Organization", "paymentIban", "TEXT");
  await ensureColumn("Organization", "notes", "TEXT");
  await ensureColumn("Organization", "isActive", "BOOLEAN NOT NULL", "true");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "role" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "passwordSalt" TEXT NOT NULL
    );
  `);

  await ensureColumn("User", "companyId", "TEXT");
  await ensureColumn("User", "balance", "DOUBLE PRECISION NOT NULL", "0");
  await ensureColumn("User", "isPlatformAdmin", "BOOLEAN NOT NULL", "false");
  await ensureColumn("User", "isActive", "BOOLEAN NOT NULL", "true");
  await ensureColumn("User", "resetToken", "TEXT");
  await ensureColumn("User", "resetTokenExpires", "TEXT");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Quote" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerUserId" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      CONSTRAINT "Quote_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AddressBookEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerUserId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      CONSTRAINT "AddressBookEntry_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SenderAddressBookEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerUserId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      CONSTRAINT "SenderAddressBookEntry_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CompanyDirectoryEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerUserId" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      CONSTRAINT "CompanyDirectoryEntry_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ShipmentRecord" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerUserId" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      CONSTRAINT "ShipmentRecord_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Session" (
      "token" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "lastSeenAt" TEXT NOT NULL,
      "expiresAt" TEXT,
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await ensureColumn("Session", "expiresAt", "TEXT");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DepositRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "requesterUserId" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "note" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "approvedByUserId" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      CONSTRAINT "DepositRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "DepositRequest_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerUserId" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "readAt" TEXT,
      "createdAt" TEXT NOT NULL,
      CONSTRAINT "Notification_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WalletLedger" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "balanceAfter" DOUBLE PRECISION NOT NULL,
      "note" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "createdByUserId" TEXT,
      "data" TEXT NOT NULL,
      CONSTRAINT "WalletLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "WalletLedger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "companyId" TEXT,
      "actorUserId" TEXT,
      "action" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProductCatalogEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ownerUserId" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      CONSTRAINT "ProductCatalogEntry_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
}

async function getOrCreateDefaultOrganization() {
  const defaultName = process.env.ADMIN_COMPANY_NAME || "Balaban Bilgisayar";
  const existingRows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id", "name", "createdAt" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1`,
  );

  if (existingRows[0]) {
    return existingRows[0];
  }

  const organization = {
    id: randomUUID(),
    name: defaultName,
    logoUrl: "",
    phone: "",
    email: "",
    address: "",
    sellerInfo: "",
    paymentAccountName: "",
    paymentIban: "",
    createdAt: new Date().toISOString(),
  };

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "Organization" ("id", "name", "logoUrl", "phone", "email", "address", "sellerInfo", "paymentAccountName", "paymentIban", "createdAt")
      VALUES (${organization.id}, ${organization.name}, ${organization.logoUrl}, ${organization.phone}, ${organization.email}, ${organization.address}, ${organization.sellerInfo}, ${organization.paymentAccountName}, ${organization.paymentIban}, ${organization.createdAt})
    `,
  );

  return organization;
}

export async function ensureSeedAdmin() {
  await ensureSchema();
  const organization = await getOrCreateDefaultOrganization();

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "User"
      SET "companyId" = ${organization.id}
      WHERE "companyId" IS NULL OR TRIM("companyId") = ''
    `,
  );

  const rows = await prisma.$queryRaw(Prisma.sql`SELECT COUNT(*) AS "count" FROM "User"`);
  const count = Number(rows[0]?.count || 0);
  if (count > 0) {
    return;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const allowProductionSeed = process.env.ALLOW_PRODUCTION_ADMIN_SEED === "true";
  if (isProduction && !allowProductionSeed) {
    console.warn("[bootstrap] Admin seed skipped in production. Set ALLOW_PRODUCTION_ADMIN_SEED=true to allow it.");
    return;
  }

  const email = process.env.ADMIN_EMAIL || "admin@balabanbilgisayar.local";
  const password = process.env.ADMIN_PASSWORD || "Balaban123!";
  const name = process.env.ADMIN_NAME || "Yonetici";
  const now = new Date().toISOString();
  const passwordData = hashPassword(password);

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "User" ("id", "name", "email", "role", "createdAt", "passwordHash", "passwordSalt", "companyId", "balance", "isPlatformAdmin", "isActive")
      VALUES (${randomUUID()}, ${name}, ${email.toLowerCase()}, ${"admin"}, ${now}, ${passwordData.hash}, ${passwordData.salt}, ${organization.id}, ${0}, ${true}, ${true})
    `,
  );
}
