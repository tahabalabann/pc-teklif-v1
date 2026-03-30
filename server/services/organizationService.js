import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { publicOrganization } from "./common.js";
import { hashPassword } from "./authService.js";
import { createAuditLog } from "./auditService.js";

export async function getOrganizationForUser(currentUser) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT "id", "name", "logoUrl", "phone", "email", "address", "sellerInfo", "paymentAccountName", "paymentIban", "notes", "isActive", "createdAt"
      FROM "Organization"
      WHERE "id" = ${currentUser.companyId}
      LIMIT 1
    `,
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
    paymentAccountName: String(settings.paymentAccountName || "").trim(),
    paymentIban: String(settings.paymentIban || "").trim(),
    notes: String(settings.notes || existing.notes || "").trim(),
  };

  if (!nextSettings.companyName) {
    throw new Error("Firma adı zorunludur.");
  }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "Organization"
      SET "name" = ${nextSettings.companyName},
          "logoUrl" = ${nextSettings.logoUrl},
          "phone" = ${nextSettings.phone},
          "email" = ${nextSettings.email},
          "address" = ${nextSettings.address},
          "sellerInfo" = ${nextSettings.sellerInfo},
          "paymentAccountName" = ${nextSettings.paymentAccountName},
          "paymentIban" = ${nextSettings.paymentIban},
          "notes" = ${nextSettings.notes}
      WHERE "id" = ${currentUser.companyId}
    `,
  );

  return getOrganizationForUser(currentUser);
}

export async function listOrganizationsForPlatformAdmin() {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        o."id" AS "id",
        o."name" AS "companyName",
        o."phone" AS "phone",
        o."email" AS "email",
        o."address" AS "address",
        o."notes" AS "notes",
        o."isActive" AS "isActive",
        o."createdAt" AS "createdAt",
        COUNT(u."id") AS "userCount",
        SUM(CASE WHEN u."role" = 'admin' THEN 1 ELSE 0 END) AS "adminCount"
      FROM "Organization" o
      LEFT JOIN "User" u ON u."companyId" = o."id"
      GROUP BY o."id", o."name", o."phone", o."email", o."address", o."notes", o."isActive", o."createdAt"
      ORDER BY o."createdAt" DESC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    companyName: row.companyName || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    notes: row.notes || "",
    createdAt: row.createdAt,
    userCount: Number(row.userCount || 0),
    adminCount: Number(row.adminCount || 0),
    isActive: Boolean(row.isActive ?? 1),
  }));
}

export async function createOrganizationWithAdmin({ companyName, adminName, adminEmail, adminPassword }) {
  const normalizedCompanyName = String(companyName || "").trim();
  const normalizedAdminName = String(adminName || "").trim();
  const normalizedAdminEmail = String(adminEmail || "").trim().toLowerCase();
  const normalizedAdminPassword = String(adminPassword || "");

  if (!normalizedCompanyName || !normalizedAdminName || !normalizedAdminEmail || !normalizedAdminPassword) {
    throw new Error("Firma ve ilk admin bilgileri zorunludur.");
  }

  const existingOrganizationRows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Organization" WHERE LOWER("name") = LOWER(${normalizedCompanyName}) LIMIT 1`,
  );
  if (existingOrganizationRows[0]) {
    throw new Error("Bu firma adıyla kayıtlı bir organizasyon zaten var.");
  }

  const existingUserRows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id" FROM "User" WHERE "email" = ${normalizedAdminEmail} LIMIT 1`,
  );
  if (existingUserRows[0]) {
    throw new Error("Bu e-posta ile kayıtlı bir kullanıcı zaten var.");
  }

  const organizationId = randomUUID();
  const now = new Date().toISOString();
  const passwordData = hashPassword(normalizedAdminPassword);

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "Organization" ("id", "name", "logoUrl", "phone", "email", "address", "sellerInfo", "paymentAccountName", "paymentIban", "createdAt")
      VALUES (${organizationId}, ${normalizedCompanyName}, ${""}, ${""}, ${""}, ${""}, ${""}, ${""}, ${""}, ${now})
    `,
  );

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "User" ("id", "name", "email", "role", "createdAt", "passwordHash", "passwordSalt", "companyId", "balance", "isPlatformAdmin")
      VALUES (
        ${randomUUID()},
        ${normalizedAdminName},
        ${normalizedAdminEmail},
        ${"admin"},
        ${now},
        ${passwordData.hash},
        ${passwordData.salt},
        ${organizationId},
        ${0},
        ${0}
      )
    `,
  );

  await createAuditLog({
    companyId: organizationId,
    actorUserId: null,
    action: "organization_created",
    entityType: "organization",
    entityId: organizationId,
    message: `${normalizedCompanyName} firması oluşturuldu.`,
  });

  const createdRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        o."id" AS "id",
        o."name" AS "companyName",
        o."createdAt" AS "createdAt",
        COUNT(u."id") AS "userCount",
        SUM(CASE WHEN u."role" = 'admin' THEN 1 ELSE 0 END) AS "adminCount"
      FROM "Organization" o
      LEFT JOIN "User" u ON u."companyId" = o."id"
      WHERE o."id" = ${organizationId}
      GROUP BY o."id", o."name", o."createdAt"
    `,
  );

  return {
    id: createdRows[0].id,
    companyName: createdRows[0].companyName || "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    createdAt: createdRows[0].createdAt,
    userCount: Number(createdRows[0].userCount || 0),
    adminCount: Number(createdRows[0].adminCount || 0),
    isActive: true,
  };
}

export async function updateOrganizationAsPlatformAdmin(organizationId, payload) {
  const existingRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT "id", "name", "phone", "email", "address", "notes", "isActive", "createdAt"
      FROM "Organization"
      WHERE "id" = ${organizationId}
      LIMIT 1
    `,
  );

  const existing = existingRows[0];
  if (!existing) {
    throw new Error("Firma bulunamadı.");
  }

  const nextCompanyName = String(payload.companyName || existing.name || "").trim();
  if (!nextCompanyName) {
    throw new Error("Firma adı zorunludur.");
  }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "Organization"
      SET "name" = ${nextCompanyName},
          "phone" = ${String(payload.phone || "").trim()},
          "email" = ${String(payload.email || "").trim()},
          "address" = ${String(payload.address || "").trim()},
          "notes" = ${String(payload.notes || "").trim()}
      WHERE "id" = ${organizationId}
    `,
  );

  const summaryRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        o."id" AS "id",
        o."name" AS "companyName",
        o."phone" AS "phone",
        o."email" AS "email",
        o."address" AS "address",
        o."notes" AS "notes",
        o."isActive" AS "isActive",
        o."createdAt" AS "createdAt",
        COUNT(u."id") AS "userCount",
        SUM(CASE WHEN u."role" = 'admin' THEN 1 ELSE 0 END) AS "adminCount"
      FROM "Organization" o
      LEFT JOIN "User" u ON u."companyId" = o."id"
      WHERE o."id" = ${organizationId}
      GROUP BY o."id", o."name", o."phone", o."email", o."address", o."notes", o."isActive", o."createdAt"
    `,
  );

  const row = summaryRows[0];
  return {
    id: row.id,
    companyName: row.companyName || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    notes: row.notes || "",
    createdAt: row.createdAt,
    userCount: Number(row.userCount || 0),
    adminCount: Number(row.adminCount || 0),
    isActive: Boolean(row.isActive ?? 1),
  };
}

export async function deleteOrganizationAsPlatformAdmin(organizationId) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} LIMIT 1`,
  );

  if (!rows[0]) return;

  const platformAdminCountRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT COUNT(*) AS "count"
      FROM "User"
      WHERE "companyId" = ${organizationId} AND "isPlatformAdmin" = true
    `,
  );

  if (Number(platformAdminCountRows[0]?.count || 0) > 0) {
    throw new Error("Platform admin firmasını silemezsiniz.");
  }

  await prisma.$executeRaw(
    Prisma.sql`UPDATE "Organization" SET "isActive" = ${false} WHERE "id" = ${organizationId}`,
  );
}

export async function toggleOrganizationActiveAsPlatformAdmin(organizationId, isActive) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} LIMIT 1`,
  );

  if (!rows[0]) {
    throw new Error("Firma bulunamadı.");
  }

  await prisma.$executeRaw(
    Prisma.sql`UPDATE "Organization" SET "isActive" = ${isActive} WHERE "id" = ${organizationId}`,
  );

  const summaries = await listOrganizationsForPlatformAdmin();
  const updated = summaries.find((item) => item.id === organizationId);
  if (!updated) {
    throw new Error("Firma bulunamadı.");
  }

  return updated;
}
