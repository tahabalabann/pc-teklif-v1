import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export async function createAuditLog({ companyId, actorUserId, action, entityType, entityId, message, data = {} }, db = prisma) {
  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "AuditLog" ("id", "companyId", "actorUserId", "action", "entityType", "entityId", "message", "data", "createdAt")
      VALUES (
        ${randomUUID()},
        ${companyId || null},
        ${actorUserId || null},
        ${action},
        ${entityType},
        ${entityId},
        ${message},
        ${JSON.stringify(data)},
        ${new Date().toISOString()}
      )
    `,
  );
}

export async function listAuditLogsForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        a."id" AS "id",
        a."companyId" AS "companyId",
        company."name" AS "companyName",
        a."actorUserId" AS "actorUserId",
        actor."name" AS "actorName",
        a."action" AS "action",
        a."entityType" AS "entityType",
        a."entityId" AS "entityId",
        a."message" AS "message",
        a."createdAt" AS "createdAt"
      FROM "AuditLog" a
      LEFT JOIN "User" actor ON actor."id" = a."actorUserId"
      LEFT JOIN "Organization" company ON company."id" = a."companyId"
      WHERE a."companyId" = ${user.companyId} OR ${user.isPlatformAdmin ? 1 : 0} = 1
      ORDER BY a."createdAt" DESC
      LIMIT 200
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    companyId: row.companyId || "",
    companyName: row.companyName || "",
    actorUserId: row.actorUserId || "",
    actorName: row.actorName || "",
    action: row.action || "",
    entityType: row.entityType || "",
    entityId: row.entityId || "",
    message: row.message || "",
    createdAt: row.createdAt,
  }));
}
