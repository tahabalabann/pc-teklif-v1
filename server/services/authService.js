import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { publicUser } from "./common.js";

export function hashPassword(password, salt = randomUUID()) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const hashedBuffer = Buffer.from(hash, "hex");
  const suppliedBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashedBuffer, suppliedBuffer);
}

export async function authenticateUser(email, password) {
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
        u."passwordHash" AS "passwordHash",
        u."passwordSalt" AS "passwordSalt",
        u."companyId" AS "companyId",
        o."name" AS "companyName",
        o."isActive" AS "companyIsActive"
      FROM "User" u
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE u."email" = ${email.toLowerCase()}
      LIMIT 1
    `,
  );

  const user = rows[0];
  if (!user) return null;
  if (!Boolean(user.isActive ?? 1)) return null;
  if (user.companyId && !Boolean(user.companyIsActive ?? 1)) return null;

  return verifyPassword(password, user.passwordSalt, user.passwordHash) ? publicUser(user) : null;
}

export async function createPasswordResetToken(email) {
  const normalizedEmail = email.toLowerCase();
  const userRows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id" FROM "User" WHERE "email" = ${normalizedEmail} LIMIT 1`
  );
  if (!userRows[0]) return null;

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

  await prisma.$executeRaw(
    Prisma.sql`UPDATE "User" SET "resetToken" = ${token}, "resetTokenExpires" = ${expiresAt} WHERE "id" = ${userRows[0].id}`
  );

  return token;
}

export async function resetPasswordWithToken(token, newPasswordHash, salt) {
  const userRows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id" FROM "User" WHERE "resetToken" = ${token} AND "resetTokenExpires" > ${new Date().toISOString()} LIMIT 1`
  );
  if (!userRows[0]) throw new Error("Geçersiz veya süresi dolmuş token.");

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "User" 
      SET "passwordHash" = ${newPasswordHash}, "passwordSalt" = ${salt}, "resetToken" = NULL, "resetTokenExpires" = NULL 
      WHERE "id" = ${userRows[0].id}
    `
  );

  return true;
}

export async function createSessionForUser(user) {
  const token = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(); // 8 saat

  await prisma.$executeRaw(
    Prisma.sql`
      VALUES (${token}, ${user.id}, ${now}, ${now}, ${expiresAt})
    `,
  );

  return token;
}

export async function getSessionUser(token) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        s."token" AS "token",
        s."expiresAt" AS "expiresAt",
        u."id" AS "id",
        u."name" AS "name",
        u."email" AS "email",
        u."role" AS "role",
        u."createdAt" AS "createdAt",
        u."balance" AS "balance",
        u."isPlatformAdmin" AS "isPlatformAdmin",
        u."isActive" AS "isActive",
        u."companyId" AS "companyId",
        o."name" AS "companyName",
        o."isActive" AS "companyIsActive"
      FROM "Session" s
      JOIN "User" u ON u."id" = s."userId"
      LEFT JOIN "Organization" o ON o."id" = u."companyId"
      WHERE s."token" = ${token}
      LIMIT 1
    `,
  );

  const row = rows[0];
  if (!row) return null;

  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    await prisma.$executeRaw(Prisma.sql`DELETE FROM "Session" WHERE "token" = ${token}`);
    return null;
  }

  if (!Boolean(row.isActive ?? 1)) {
    await prisma.$executeRaw(Prisma.sql`DELETE FROM "Session" WHERE "token" = ${token}`);
    return null;
  }

  if (row.companyId && !Boolean(row.companyIsActive ?? 1)) {
    await prisma.$executeRaw(Prisma.sql`DELETE FROM "Session" WHERE "token" = ${token}`);
    return null;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "Session"
      SET "lastSeenAt" = ${new Date().toISOString()}
      WHERE "token" = ${token}
    `,
  );

  return {
    token: row.token,
    user: publicUser(row),
  };
}

export async function deleteSession(token) {
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "Session" WHERE "token" = ${token}`);
}
