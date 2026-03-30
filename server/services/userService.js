import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { publicUser } from "./common.js";
import { hashPassword } from "./authService.js";
import { createAuditLog } from "./auditService.js";

export async function listUsers(currentUser) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."balance" AS "balance",
        u."isPlatformAdmin" AS "isPlatformAdmin",
        u."isActive" AS "isActive",
        u."companyId" AS "companyId",
        o."name" AS "companyName"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE u."companyId" = ${currentUser.companyId}
      ORDER BY u."createdAt" ASC
    `,
  );

  return rows.map(publicUser);
}

export async function createUser({ name, email, password, role, companyId, actorUser = null }) {
  const normalizedEmail = email.toLowerCase();
  const existingRows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id" FROM "User" WHERE "email" = ${normalizedEmail} LIMIT 1`,
  );

  if (existingRows[0]) {
    throw new Error("Bu e-posta ile kayıtlı bir kullanıcı zaten var.");
  }

  const now = new Date().toISOString();
  const passwordData = hashPassword(password);
  const id = randomUUID();

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "User" ("id", "name", "email", "role", "createdAt", "passwordHash", "passwordSalt", "companyId", "balance", "isPlatformAdmin", "isActive")
      VALUES (
        ${id},
        ${name},
        ${normalizedEmail},
        ${["admin", "staff", "accounting", "operations", "shipping", "sales", "customer"].includes(role) ? role : "customer"},
        ${now},
        ${passwordData.hash},
        ${passwordData.salt},
        ${companyId || null},
        ${0},
        ${false},
        ${true}
      )
    `,
  );

  const userRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."balance" AS "balance",
        u."isPlatformAdmin" AS "isPlatformAdmin",
        u."isActive" AS "isActive",
        u."companyId" AS "companyId",
        o."name" AS "companyName"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE u."id" = ${id}
      LIMIT 1
    `,
  );

  const createdUser = publicUser(userRows[0]);

  if (actorUser) {
    await createAuditLog({
      companyId,
      actorUserId: actorUser.id,
      action: "user_created",
      entityType: "user",
      entityId: createdUser.id,
      message: `${actorUser.name} yeni bir kullanıcı hesabı oluşturdu.`,
    });
  }

  return createdUser;
}

export async function deleteUserForAdmin(currentUser, targetUserId) {
  if (currentUser.id === targetUserId) {
    throw new Error("Kendi hesabınızı bu ekrandan silemezsiniz.");
  }

  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT "id", "companyId", "role", "isPlatformAdmin"
      FROM "User"
      WHERE "id" = ${targetUserId}
      LIMIT 1
    `,
  );

  const targetUser = rows[0];
  if (!targetUser) return;

  if (!currentUser.isPlatformAdmin && targetUser.companyId !== currentUser.companyId) {
    throw new Error("Bu kullanıcı başka bir firmaya ait.");
  }

  if (targetUser.isPlatformAdmin) {
    throw new Error("Platform admin kullanıcı silinemez.");
  }

  if (targetUser.role === "admin") {
    const adminCountRows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "User"
        WHERE "companyId" = ${targetUser.companyId} AND "role" = 'admin'
      `,
    );

    if (Number(adminCountRows[0]?.count || 0) <= 1) {
      throw new Error("Firmanın son admin kullanıcısı silinemez.");
    }
  }

  await prisma.$executeRaw(
    Prisma.sql`UPDATE "User" SET "isActive" = ${false} WHERE "id" = ${targetUserId}`,
  );
  
  await createAuditLog({
    companyId: currentUser.companyId,
    actorUserId: currentUser.id,
    action: "user_deactivated",
    entityType: "user",
    entityId: targetUserId,
    message: `${currentUser.name} kullanıcısı bir kullanıcı hesabını pasife aldı.`,
  });
}

export async function toggleUserActiveForAdmin(currentUser, targetUserId, isActive) {
  if (currentUser.id === targetUserId) {
    throw new Error("Kendi hesabınızın durumunu bu ekrandan değiştiremezsiniz.");
  }

  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT "id", "companyId", "isPlatformAdmin"
      FROM "User"
      WHERE "id" = ${targetUserId}
      LIMIT 1
    `,
  );

  const targetUser = rows[0];
  if (!targetUser) throw new Error("Kullanıcı bulunamadı.");

  if (!currentUser.isPlatformAdmin && targetUser.companyId !== currentUser.companyId) {
    throw new Error("Bu kullanıcı başka bir firmaya ait.");
  }

  if (targetUser.isPlatformAdmin) {
    throw new Error("Platform admin kullanıcısının durumu değiştirilemez.");
  }

  await prisma.$executeRaw(
    Prisma.sql`UPDATE "User" SET "isActive" = ${isActive} WHERE "id" = ${targetUserId}`,
  );

  const userRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."balance" AS "balance",
        u."isPlatformAdmin" AS "isPlatformAdmin",
        u."isActive" AS "isActive",
        u."companyId" AS "companyId",
        o."name" AS "companyName"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE u."id" = ${targetUserId}
      LIMIT 1
    `,
  );

  await createAuditLog({
    companyId: currentUser.companyId,
    actorUserId: currentUser.id,
    action: isActive ? "user_activated" : "user_deactivated",
    entityType: "user",
    entityId: targetUserId,
    message: `${currentUser.name} kullanıcısı bir kullanıcı hesabının durumunu değiştirdi.`,
  });

  return publicUser(userRows[0]);
}

export async function listUsersForOrganizationAsPlatformAdmin(organizationId) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."balance" AS "balance",
        u."isPlatformAdmin" AS "isPlatformAdmin",
        u."isActive" AS "isActive",
        u."companyId" AS "companyId",
        o."name" AS "companyName"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE u."companyId" = ${organizationId}
      ORDER BY u."createdAt" ASC
    `,
  );

  return rows.map(publicUser);
}

export async function listUsersForDashboard(currentUser) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."balance" AS "balance",
        u."isPlatformAdmin" AS "isPlatformAdmin",
        u."isActive" AS "isActive",
        u."companyId" AS "companyId",
        o."name" AS "companyName"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE u."companyId" = ${currentUser.companyId} OR ${currentUser.isPlatformAdmin ? 1 : 0} = 1
      ORDER BY u."createdAt" ASC
    `,
  );

  return rows.map(publicUser);
}
