import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
}

async function ensureColumn(tableName, columnName, columnType) {
  const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}")`);
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnType}`);
  }
}

function hashPassword(password, salt = randomUUID()) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const hashedBuffer = Buffer.from(hash, "hex");
  const suppliedBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashedBuffer, suppliedBuffer);
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
    companyId: row.companyId,
    companyName: row.companyName || "",
  };
}

function publicOrganization(row) {
  return {
    id: row.id,
    companyName: row.name || "",
    logoUrl: row.logoUrl || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    sellerInfo: row.sellerInfo || "",
    createdAt: row.createdAt,
  };
}

async function getOrCreateDefaultOrganization() {
  const defaultName = process.env.ADMIN_COMPANY_NAME || "Balaban Bilgisayar";
  const existingRows = await prisma.$queryRawUnsafe(
    `SELECT "id", "name", "createdAt" FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1`,
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
    createdAt: new Date().toISOString(),
  };

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "Organization" ("id", "name", "logoUrl", "phone", "email", "address", "sellerInfo", "createdAt")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    organization.id,
    organization.name,
    organization.logoUrl,
    organization.phone,
    organization.email,
    organization.address,
    organization.sellerInfo,
    organization.createdAt,
  );

  return organization;
}

export async function ensureSeedAdmin() {
  await ensureSchema();
  const organization = await getOrCreateDefaultOrganization();

  await prisma.$executeRawUnsafe(
    `
      UPDATE "User"
      SET "companyId" = ?
      WHERE "companyId" IS NULL OR TRIM("companyId") = ''
    `,
    organization.id,
  );

  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS "count" FROM "User"`);
  const count = Number(rows[0]?.count || 0);
  if (count > 0) {
    return;
  }

  const email = process.env.ADMIN_EMAIL || "admin@balabanbilgisayar.local";
  const password = process.env.ADMIN_PASSWORD || "Balaban123!";
  const name = process.env.ADMIN_NAME || "Yonetici";
  const now = new Date().toISOString();
  const passwordData = hashPassword(password);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "User" ("id", "name", "email", "role", "createdAt", "passwordHash", "passwordSalt", "companyId")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    randomUUID(),
    name,
    email.toLowerCase(),
    "admin",
    now,
    passwordData.hash,
    passwordData.salt,
    organization.id,
  );
}

export async function authenticateUser(email, password) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."passwordHash" AS "passwordHash",
        u."passwordSalt" AS "passwordSalt",
        u."companyId" AS "companyId",
        o."name" AS "companyName"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE u."email" = ?
      LIMIT 1
    `,
    email.toLowerCase(),
  );

  const user = rows[0];
  if (!user) {
    return null;
  }

  return verifyPassword(password, user.passwordSalt, user.passwordHash) ? publicUser(user) : null;
}

export async function listUsers(currentUser) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."companyId" AS "companyId",
        o."name" AS "companyName"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE u."companyId" = ?
      ORDER BY u."createdAt" ASC
    `,
    currentUser.companyId,
  );

  return rows.map(publicUser);
}

export async function getOrganizationForUser(currentUser) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT "id", "name", "logoUrl", "phone", "email", "address", "sellerInfo", "createdAt"
      FROM "Organization"
      WHERE "id" = ?
      LIMIT 1
    `,
    currentUser.companyId,
  );

  if (!rows[0]) {
    throw new Error("Firma ayarları bulunamadı.");
  }

  return publicOrganization(rows[0]);
}

export async function updateOrganizationForUser(currentUser, settings) {
  const existing = await getOrganizationForUser(currentUser);
  const nextSettings = {
    companyName: String(settings.companyName || existing.companyName).trim(),
    logoUrl: String(settings.logoUrl || "").trim(),
    phone: String(settings.phone || "").trim(),
    email: String(settings.email || "").trim(),
    address: String(settings.address || "").trim(),
    sellerInfo: String(settings.sellerInfo || "").trim(),
  };

  if (!nextSettings.companyName) {
    throw new Error("Firma adı zorunludur.");
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Organization"
      SET "name" = ?, "logoUrl" = ?, "phone" = ?, "email" = ?, "address" = ?, "sellerInfo" = ?
      WHERE "id" = ?
    `,
    nextSettings.companyName,
    nextSettings.logoUrl,
    nextSettings.phone,
    nextSettings.email,
    nextSettings.address,
    nextSettings.sellerInfo,
    currentUser.companyId,
  );

  return getOrganizationForUser(currentUser);
}

export async function createUser({ name, email, password, role, companyId }) {
  const normalizedEmail = email.toLowerCase();
  const existingRows = await prisma.$queryRawUnsafe(
    `SELECT "id" FROM "User" WHERE "email" = ? LIMIT 1`,
    normalizedEmail,
  );

  if (existingRows[0]) {
    throw new Error("Bu e-posta ile kayıtlı bir kullanıcı zaten var.");
  }

  const now = new Date().toISOString();
  const passwordData = hashPassword(password);
  const id = randomUUID();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "User" ("id", "name", "email", "role", "createdAt", "passwordHash", "passwordSalt", "companyId")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    name,
    normalizedEmail,
    role === "admin" ? "admin" : "staff",
    now,
    passwordData.hash,
    passwordData.salt,
    companyId,
  );

  const userRows = await prisma.$queryRawUnsafe(
    `
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."companyId" AS "companyId",
        o."name" AS "companyName"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE u."id" = ?
      LIMIT 1
    `,
    id,
  );

  return publicUser(userRows[0]);
}

export async function createSessionForUser(user) {
  const token = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(); // 8 saat

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "Session" ("token", "userId", "createdAt", "lastSeenAt", "expiresAt")
      VALUES (?, ?, ?, ?, ?)
    `,
    token,
    user.id,
    now,
    now,
    expiresAt,
  );

  return token;
}

export async function getSessionUser(token) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT
        s."token" AS "token",
        s."expiresAt" AS "expiresAt",
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."companyId" AS "companyId",
        o."name" AS "companyName"
      FROM "Session" s
      JOIN "User" u ON u."id" = s."userId"
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE s."token" = ?
      LIMIT 1
    `,
    token,
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    await prisma.$executeRawUnsafe(`DELETE FROM "Session" WHERE "token" = ?`, token);
    return null;
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Session"
      SET "lastSeenAt" = ?
      WHERE "token" = ?
    `,
    new Date().toISOString(),
    token,
  );

  return {
    token: row.token,
    user: publicUser(row),
  };
}

export async function deleteSession(token) {
  await prisma.$executeRawUnsafe(`DELETE FROM "Session" WHERE "token" = ?`, token);
}

export async function listQuotesForUser(user) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT q."data" AS "data"
      FROM "Quote" q
      JOIN "User" u ON u."id" = q."ownerUserId"
      WHERE u."companyId" = ?
      ORDER BY q."updatedAt" DESC
    `,
    user.companyId,
  );

  return rows.map((row) => JSON.parse(row.data));
}

export async function saveQuoteForUser(user, quote) {
  const now = new Date().toISOString();
  const payload = {
    ...quote,
    ownerUserId: user.id,
    updatedAt: now,
    createdAt: quote.createdAt || now,
  };

  await assertOwnedByCompanyOrThrow("Quote", payload.id, user.companyId, "Bu teklif başka bir firmaya ait olduğu için güncellenemez.");

  const existingRows = await prisma.$queryRawUnsafe(`SELECT "id" FROM "Quote" WHERE "id" = ? LIMIT 1`, payload.id);
  if (existingRows[0]) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "Quote"
        SET "data" = ?, "updatedAt" = ?
        WHERE "id" = ?
      `,
      JSON.stringify(payload),
      payload.updatedAt,
      payload.id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "Quote" ("id", "ownerUserId", "data", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?)
      `,
      payload.id,
      user.id,
      JSON.stringify(payload),
      payload.createdAt,
      payload.updatedAt,
    );
  }

  return payload;
}

export async function deleteQuoteForUser(user, quoteId) {
  const row = await getOwnerScopedRow("Quote", quoteId);
  if (!row || row.companyId !== user.companyId) {
    return;
  }

  await prisma.$executeRawUnsafe(`DELETE FROM "Quote" WHERE "id" = ?`, quoteId);
}

export async function listAddressBookForUser(user) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT a."id", a."label", a."data", a."createdAt", a."updatedAt"
      FROM "AddressBookEntry" a
      JOIN "User" u ON u."id" = a."ownerUserId"
      WHERE u."companyId" = ?
      ORDER BY a."updatedAt" DESC
    `,
    user.companyId,
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

  await assertOwnedByCompanyOrThrow("AddressBookEntry", payload.id, user.companyId, "Bu adres kaydı başka bir firmaya ait.");

  const existingRows = await prisma.$queryRawUnsafe(`SELECT "id" FROM "AddressBookEntry" WHERE "id" = ? LIMIT 1`, payload.id);
  if (existingRows[0]) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "AddressBookEntry"
        SET "label" = ?, "data" = ?, "updatedAt" = ?
        WHERE "id" = ?
      `,
      payload.label,
      JSON.stringify(payload.recipient),
      payload.updatedAt,
      payload.id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "AddressBookEntry" ("id", "ownerUserId", "label", "data", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      payload.id,
      payload.ownerUserId,
      payload.label,
      JSON.stringify(payload.recipient),
      payload.createdAt,
      payload.updatedAt,
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
  if (!row || row.companyId !== user.companyId) {
    return;
  }

  await prisma.$executeRawUnsafe(`DELETE FROM "AddressBookEntry" WHERE "id" = ?`, addressId);
}

export async function listSenderAddressBookForUser(user) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT a."id", a."label", a."data", a."createdAt", a."updatedAt"
      FROM "SenderAddressBookEntry" a
      JOIN "User" u ON u."id" = a."ownerUserId"
      WHERE u."companyId" = ?
      ORDER BY a."updatedAt" DESC
    `,
    user.companyId,
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

  await assertOwnedByCompanyOrThrow(
    "SenderAddressBookEntry",
    payload.id,
    user.companyId,
    "Bu gönderici adresi başka bir firmaya ait.",
  );

  const existingRows = await prisma.$queryRawUnsafe(`SELECT "id" FROM "SenderAddressBookEntry" WHERE "id" = ? LIMIT 1`, payload.id);
  if (existingRows[0]) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "SenderAddressBookEntry"
        SET "label" = ?, "data" = ?, "updatedAt" = ?
        WHERE "id" = ?
      `,
      payload.label,
      JSON.stringify(payload.recipient),
      payload.updatedAt,
      payload.id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "SenderAddressBookEntry" ("id", "ownerUserId", "label", "data", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      payload.id,
      payload.ownerUserId,
      payload.label,
      JSON.stringify(payload.recipient),
      payload.createdAt,
      payload.updatedAt,
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
  if (!row || row.companyId !== user.companyId) {
    return;
  }

  await prisma.$executeRawUnsafe(`DELETE FROM "SenderAddressBookEntry" WHERE "id" = ?`, addressId);
}

export async function listCompaniesForUser(user) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT c."data" AS "data"
      FROM "CompanyDirectoryEntry" c
      JOIN "User" u ON u."id" = c."ownerUserId"
      WHERE u."companyId" = ?
      ORDER BY c."updatedAt" DESC
    `,
    user.companyId,
  );

  return rows.map((row) => JSON.parse(row.data));
}

export async function listShipmentRecordsForUser(user) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT s."data" AS "data"
      FROM "ShipmentRecord" s
      JOIN "User" u ON u."id" = s."ownerUserId"
      WHERE u."companyId" = ?
      ORDER BY s."updatedAt" DESC
    `,
    user.companyId,
  );

  return rows.map((row) => JSON.parse(row.data));
}

export async function saveShipmentRecordForUser(user, shipmentRecord) {
  const now = new Date().toISOString();
  const payload = {
    ...shipmentRecord,
    id: shipmentRecord.id || randomUUID(),
    createdAt: shipmentRecord.createdAt || now,
    updatedAt: now,
  };

  await assertOwnedByCompanyOrThrow("ShipmentRecord", payload.id, user.companyId, "Bu kargo kaydı başka bir firmaya ait.");

  const existingRows = await prisma.$queryRawUnsafe(`SELECT "id" FROM "ShipmentRecord" WHERE "id" = ? LIMIT 1`, payload.id);
  if (existingRows[0]) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "ShipmentRecord"
        SET "data" = ?, "updatedAt" = ?
        WHERE "id" = ?
      `,
      JSON.stringify(payload),
      payload.updatedAt,
      payload.id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "ShipmentRecord" ("id", "ownerUserId", "data", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?)
      `,
      payload.id,
      user.id,
      JSON.stringify(payload),
      payload.createdAt,
      payload.updatedAt,
    );
  }

  return payload;
}

export async function saveCompanyForUser(user, company) {
  const now = new Date().toISOString();
  const payload = {
    ...company,
    id: company.id || randomUUID(),
    createdAt: company.createdAt || now,
    updatedAt: now,
  };

  await assertOwnedByCompanyOrThrow("CompanyDirectoryEntry", payload.id, user.companyId, "Bu firma kaydı başka bir firmaya ait.");

  const existingRows = await prisma.$queryRawUnsafe(`SELECT "id" FROM "CompanyDirectoryEntry" WHERE "id" = ? LIMIT 1`, payload.id);
  if (existingRows[0]) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "CompanyDirectoryEntry"
        SET "data" = ?, "updatedAt" = ?
        WHERE "id" = ?
      `,
      JSON.stringify(payload),
      payload.updatedAt,
      payload.id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "CompanyDirectoryEntry" ("id", "ownerUserId", "data", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?)
      `,
      payload.id,
      user.id,
      JSON.stringify(payload),
      payload.createdAt,
      payload.updatedAt,
    );
  }

  return payload;
}

export async function deleteCompanyForUser(user, companyId) {
  const row = await getOwnerScopedRow("CompanyDirectoryEntry", companyId);
  if (!row || row.companyId !== user.companyId) {
    return;
  }

  await prisma.$executeRawUnsafe(`DELETE FROM "CompanyDirectoryEntry" WHERE "id" = ?`, companyId);
}

export async function disconnectStore() {
  await prisma.$disconnect();
}

async function getOwnerScopedRow(tableName, recordId) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT t."ownerUserId" AS "ownerUserId", u."companyId" AS "companyId"
      FROM "${tableName}" t
      JOIN "User" u ON u."id" = t."ownerUserId"
      WHERE t."id" = ?
      LIMIT 1
    `,
    recordId,
  );

  return rows[0] || null;
}

async function assertOwnedByCompanyOrThrow(tableName, recordId, companyId, message) {
  const row = await getOwnerScopedRow(tableName, recordId);
  if (row && row.companyId !== companyId) {
    throw new Error(message);
  }
}
