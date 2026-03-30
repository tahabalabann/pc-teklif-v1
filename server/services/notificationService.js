import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export async function createNotificationForUser(userId, payload, db = prisma) {
  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "Notification" ("id", "ownerUserId", "data", "readAt", "createdAt")
      VALUES (${randomUUID()}, ${userId}, ${JSON.stringify(payload)}, ${null}, ${new Date().toISOString()})
    `,
  );
}

export async function createCompanyAdminNotifications(companyId, payload) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT "id"
      FROM "User"
      WHERE "companyId" = ${companyId} AND "role" = 'admin'
    `,
  );

  await Promise.all(rows.map((row) => createNotificationForUser(row.id, payload)));
}

export async function listNotificationsForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT n."id" AS "id", n."data" AS "data", n."readAt" AS "readAt", n."createdAt" AS "createdAt"
      FROM "Notification" n
      WHERE n."ownerUserId" = ${user.id}
      ORDER BY n."createdAt" DESC
      LIMIT 50
    `,
  );

  return rows.map((row) => {
    const payload = JSON.parse(row.data);
    return {
      id: row.id,
      type: payload.type || "low_balance",
      title: payload.title || "",
      message: payload.message || "",
      readAt: row.readAt || "",
      createdAt: row.createdAt,
    };
  });
}

export async function markAllNotificationsReadForUser(user) {
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "Notification"
      SET "readAt" = ${new Date().toISOString()}
      WHERE "ownerUserId" = ${user.id} AND ("readAt" IS NULL OR TRIM("readAt") = '')
    `,
  );
}
