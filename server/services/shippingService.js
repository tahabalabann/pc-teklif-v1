import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { assertOwnedByRecordOwnerOrThrow, getOwnerScopedRow } from "./common.js";
import { createAuditLog } from "./auditService.js";

export async function listShipmentRecordsForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT s."data" AS "data"
      FROM "ShipmentRecord" s
      JOIN "User" u ON u."id" = s."ownerUserId"
      WHERE u."companyId" = ${user.companyId}
      ORDER BY s."updatedAt" DESC
    `,
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

  await assertOwnedByRecordOwnerOrThrow("ShipmentRecord", payload.id, user, "Bu kargo kaydı başka bir firmaya ait.");

  const existingRows = await prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "ShipmentRecord" WHERE "id" = ${payload.id} LIMIT 1`);
  if (existingRows[0]) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "ShipmentRecord"
        SET "data" = ${JSON.stringify(payload)}, "updatedAt" = ${payload.updatedAt}
        WHERE "id" = ${payload.id}
      `
    );
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "ShipmentRecord" ("id", "ownerUserId", "data", "createdAt", "updatedAt")
        VALUES (${payload.id}, ${user.id}, ${JSON.stringify(payload)}, ${payload.createdAt}, ${payload.updatedAt})
      `
    );
  }

  await createAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "shipment_record_saved",
    entityType: "shipment",
    entityId: payload.id,
    message: `${user.name} bir kargo kaydı oluşturdu.`,
  });

  return payload;
}

export async function deleteShipmentRecordForUser(user, shipmentId) {
  const row = await getOwnerScopedRow("ShipmentRecord", shipmentId);
  if (!row || row.companyId !== user.companyId) return;
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "ShipmentRecord" WHERE "id" = ${shipmentId}`);
}

export async function createShipmentAuditLogForUser(user, quoteIdentifier, shipment) {
  await createAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "shipment_created",
    entityType: "shipment",
    entityId: shipment.shipmentId || shipment.transactionId || quoteIdentifier,
    message: `${user.name} bir kargo kodu oluşturdu.`,
    data: {
      quoteIdentifier,
      providerName: shipment.providerName || "",
      providerServiceCode: shipment.providerServiceCode || "",
      shipmentPrice: Number(shipment.shipmentPrice || 0),
    },
  });
}
