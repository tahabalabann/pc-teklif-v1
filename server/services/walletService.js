import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { createAuditLog } from "./auditService.js";
import { createNotificationForUser, createCompanyAdminNotifications } from "./notificationService.js";

export async function getWalletSummaryForUser(user) {
  const balanceRows = await prisma.$queryRaw(
    Prisma.sql`SELECT "balance" FROM "User" WHERE "id" = ${user.id} LIMIT 1`,
  );

  return {
    balance: Number(balanceRows[0]?.balance || 0),
    requests: await listDepositRequestsForUser(user),
  };
}

export async function listWalletLedgerForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        w."id" AS "id",
        w."userId" AS "userId",
        target."name" AS "userName",
        w."companyId" AS "companyId",
        company."name" AS "companyName",
        w."type" AS "type",
        w."amount" AS "amount",
        w."balanceAfter" AS "balanceAfter",
        w."note" AS "note",
        w."createdAt" AS "createdAt",
        w."createdByUserId" AS "createdByUserId",
        creator."name" AS "createdByName"
      FROM "WalletLedger" w
      LEFT JOIN "User" target ON target."id" = w."userId"
      LEFT JOIN "User" creator ON creator."id" = w."createdByUserId"
      LEFT JOIN "Organization" company ON company."id" = w."companyId"
      WHERE w."companyId" = ${user.companyId} OR ${user.isPlatformAdmin ? 1 : 0} = 1
      ORDER BY w."createdAt" DESC
      LIMIT 200
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    userName: row.userName || "",
    companyId: row.companyId,
    companyName: row.companyName || "",
    type: row.type,
    amount: Number(row.amount || 0),
    balanceAfter: Number(row.balanceAfter || 0),
    note: row.note || "",
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId || "",
    createdByName: row.createdByName || "",
  }));
}

export async function listDepositRequestsForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        d."id" AS "id",
        d."requesterUserId" AS "requesterUserId",
        requester."name" AS "requesterName",
        requester."email" AS "requesterEmail",
        d."amount" AS "amount",
        d."note" AS "note",
        d."status" AS "status",
        d."approvedByUserId" AS "approvedByUserId",
        approver."name" AS "approvedByName",
        d."createdAt" AS "createdAt",
        d."updatedAt" AS "updatedAt"
      FROM "DepositRequest" d
      JOIN "User" requester ON requester."id" = d."requesterUserId"
      LEFT JOIN "User" approver ON approver."id" = d."approvedByUserId"
      WHERE requester."companyId" = ${user.companyId}
      ORDER BY d."createdAt" DESC
    `,
  );

  return rows
    .filter((row) => user.role === "admin" || row.requesterUserId === user.id)
    .map((row) => ({
      id: row.id,
      requesterUserId: row.requesterUserId,
      requesterName: row.requesterName || "",
      requesterEmail: row.requesterEmail || "",
      amount: Number(row.amount || 0),
      note: row.note || "",
      status: row.status || "pending",
      approvedByUserId: row.approvedByUserId || "",
      approvedByName: row.approvedByName || "",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
}

export async function createDepositRequestForUser(user, { amount, note }) {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Yükleme tutarı sıfırdan büyük olmalıdır.");
  }

  const now = new Date().toISOString();
  const payload = {
    id: randomUUID(),
    requesterUserId: user.id,
    requesterName: user.name,
    requesterEmail: user.email,
    amount: numericAmount,
    note: String(note || "").trim(),
    status: "pending",
    approvedByUserId: "",
    approvedByName: "",
    createdAt: now,
    updatedAt: now,
  };

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "DepositRequest" ("id", "requesterUserId", "amount", "note", "status", "approvedByUserId", "createdAt", "updatedAt")
      VALUES (
        ${payload.id},
        ${payload.requesterUserId},
        ${payload.amount},
        ${payload.note},
        ${payload.status},
        ${null},
        ${payload.createdAt},
        ${payload.updatedAt}
      )
    `,
  );

  await createCompanyAdminNotifications(user.companyId, {
    type: "deposit_request_created",
    title: "Yeni bakiye yükleme talebi",
    message: `${user.name} kullanıcısı ${numericAmount.toFixed(2)} TL için yükleme talebi oluşturdu.`,
  });

  await createAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "deposit_request_created",
    entityType: "deposit_request",
    entityId: payload.id,
    message: `${user.name} yeni bakiye yükleme talebi oluşturdu.`,
  });

  return payload;
}

export async function approveDepositRequestForUser(user, requestId) {
  const request = await getDepositRequestRowForCompany(user.companyId, requestId);
  if (!request) {
    throw new Error("Bakiye talebi bulunamadı.");
  }

  const approvedAmount = Number(request.amount || 0);
  const now = new Date().toISOString();

  const balance = await prisma.$transaction(async (tx) => {
    const updatedRequests = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "DepositRequest"
        SET "status" = ${"approved"}, "approvedByUserId" = ${user.id}, "updatedAt" = ${now}
        WHERE "id" = ${requestId} AND "status" = ${"pending"}
      `,
    );

    if (updatedRequests === 0) {
      throw new Error("Bu talep zaten işlenmiş.");
    }

    const updatedUsers = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "User"
        SET "balance" = COALESCE("balance", 0) + ${approvedAmount}
        WHERE "id" = ${request.requesterUserId}
      `,
    );

    if (updatedUsers === 0) {
      throw new Error("Kullanıcı bulunamadı.");
    }

    const nextBalance = await getUserBalance(request.requesterUserId, tx);

    await createNotificationForUser(
      request.requesterUserId,
      {
        type: "deposit_request_approved",
        title: "Bakiye talebiniz onaylandı",
        message: `${approvedAmount.toFixed(2)} TL bakiyenize eklendi.`,
      },
      tx,
    );

    await createWalletLedgerEntry(
      {
        userId: request.requesterUserId,
        companyId: user.companyId,
        type: "deposit_approved",
        amount: approvedAmount,
        balanceAfter: nextBalance,
        note: "Bakiye yükleme talebi onaylandı.",
        createdByUserId: user.id,
      },
      tx,
    );

    await createAuditLog(
      {
        companyId: user.companyId,
        actorUserId: user.id,
        action: "deposit_request_approved",
        entityType: "deposit_request",
        entityId: requestId,
        message: `${user.name} bir bakiye talebini onayladı.`,
      },
      tx,
    );

    return nextBalance;
  });

  return {
    request: await getDepositRequestByIdForCompany(user.companyId, requestId),
    balance,
  };
}

export async function rejectDepositRequestForUser(user, requestId) {
  const request = await getDepositRequestRowForCompany(user.companyId, requestId);
  if (!request) {
    throw new Error("Bakiye talebi bulunamadı.");
  }

  const now = new Date().toISOString();

  await prisma.$transaction(async (tx) => {
    const updatedRequests = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "DepositRequest"
        SET "status" = ${"rejected"}, "approvedByUserId" = ${user.id}, "updatedAt" = ${now}
        WHERE "id" = ${requestId} AND "status" = ${"pending"}
      `,
    );

    if (updatedRequests === 0) {
      throw new Error("Bu talep zaten işlenmiş.");
    }

    await createNotificationForUser(
      request.requesterUserId,
      {
        type: "deposit_request_rejected",
        title: "Bakiye talebiniz reddedildi",
        message: "Yükleme talebiniz admin tarafından reddedildi. Gerekirse tekrar talep oluşturabilirsiniz.",
      },
      tx,
    );

    await createAuditLog(
      {
        companyId: user.companyId,
        actorUserId: user.id,
        action: "deposit_request_rejected",
        entityType: "deposit_request",
        entityId: requestId,
        message: `${user.name} bir bakiye talebini reddetti.`,
      },
      tx,
    );
  });

  return getDepositRequestByIdForCompany(user.companyId, requestId);
}

export async function getUserBalance(userId, db = prisma) {
  const rows = await db.$queryRaw(
    Prisma.sql`SELECT "balance" FROM "User" WHERE "id" = ${userId} LIMIT 1`,
  );

  return Number(rows[0]?.balance || 0);
}

export async function consumeUserBalance(userId, amount) {
  const numericAmount = Number(amount || 0);
  if (numericAmount <= 0) {
    return await getUserBalance(userId);
  }

  return await prisma.$transaction(async (tx) => {
    const userRows = await tx.$queryRaw(
      Prisma.sql`SELECT "companyId" FROM "User" WHERE "id" = ${userId} LIMIT 1`,
    );

    const userRow = userRows[0];
    if (!userRow) {
      throw new Error("Kullanıcı bulunamadı.");
    }

    const updatedUsers = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "User"
        SET "balance" = COALESCE("balance", 0) - ${numericAmount}
        WHERE "id" = ${userId} AND COALESCE("balance", 0) >= ${numericAmount}
      `,
    );

    if (updatedUsers === 0) {
      throw new Error("Bakiyeniz yetersiz. Önce bakiye yükleme talebi oluşturun.");
    }

    const nextBalance = await getUserBalance(userId, tx);

    await createWalletLedgerEntry(
      {
        userId,
        companyId: userRow.companyId || "",
        type: "shipping_charge",
        amount: -numericAmount,
        balanceAfter: nextBalance,
        note: "Kargo gönderisi bakiyeden düşüldü.",
        createdByUserId: userId,
      },
      tx,
    );

    if (nextBalance < 150) {
      await createNotificationForUser(
        userId,
        {
          type: "low_balance",
          title: "Bakiyeniz kritik seviyeye düştü",
          message: `Mevcut bakiyeniz ${nextBalance.toFixed(2)} TL. 150 TL altı bakiyede yeni kargo kodu oluşturamazsınız.`,
        },
        tx,
      );
    }

    return nextBalance;
  });
}

export async function createWalletLedgerEntry({
  userId,
  companyId,
  type,
  amount,
  balanceAfter,
  note,
  createdByUserId,
}, db = prisma) {
  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "WalletLedger" ("id", "userId", "companyId", "type", "amount", "balanceAfter", "note", "createdAt", "createdByUserId", "data")
      VALUES (
        ${randomUUID()},
        ${userId},
        ${companyId},
        ${type},
        ${amount},
        ${balanceAfter},
        ${note},
        ${new Date().toISOString()},
        ${createdByUserId || null},
        ${JSON.stringify({})}
      )
    `,
  );
}

export async function getDepositRequestRowForCompany(companyId, requestId) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT d."id", d."amount", d."requesterUserId", u."companyId"
      FROM "DepositRequest" d
      JOIN "User" u ON u."id" = d."requesterUserId"
      WHERE d."id" = ${requestId} AND u."companyId" = ${companyId}
      LIMIT 1
    `,
  );
  return rows[0] || null;
}

export async function getDepositRequestByIdForCompany(companyId, requestId) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        d."id" AS "id",
        d."requesterUserId" AS "requesterUserId",
        requester."name" AS "requesterName",
        requester."email" AS "requesterEmail",
        requester."companyId" AS "companyId",
        d."amount" AS "amount",
        d."note" AS "note",
        d."status" AS "status",
        d."approvedByUserId" AS "approvedByUserId",
        approver."name" AS "approvedByName",
        d."createdAt" AS "createdAt",
        d."updatedAt" AS "updatedAt"
      FROM "DepositRequest" d
      JOIN "User" requester ON requester."id" = d."requesterUserId"
      LEFT JOIN "User" approver ON approver."id" = d."approvedByUserId"
      WHERE d."id" = ${requestId}
      LIMIT 1
    `,
  );

  const row = rows[0] || null;
  if (!row || row.companyId !== companyId) {
    return null;
  }

  return {
    id: row.id,
    requesterUserId: row.requesterUserId,
    requesterName: row.requesterName || "",
    requesterEmail: row.requesterEmail || "",
    amount: Number(row.amount || 0),
    note: row.note || "",
    status: row.status || "pending",
    approvedByUserId: row.approvedByUserId || "",
    approvedByName: row.approvedByName || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createManualWalletAdjustment(adminUser, { userId, amount, note }) {
  const numericAmount = Number(amount || 0);
  const targetUserId = userId;

  return await prisma.$transaction(async (tx) => {
    // Get target user to ensure they exist and get their companyId
    const userRows = await tx.$queryRaw(
      Prisma.sql`SELECT "companyId" FROM "User" WHERE "id" = ${targetUserId} LIMIT 1`
    );
    const targetUser = userRows[0];
    if (!targetUser) throw new Error("Hedef kullanıcı bulunamadı.");

    // Update balance
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "User" 
        SET "balance" = COALESCE("balance", 0) + ${numericAmount}
        WHERE "id" = ${targetUserId}
      `
    );

    const nextBalance = await getUserBalance(targetUserId, tx);

    // Create ledger entry
    await createWalletLedgerEntry({
      userId: targetUserId,
      companyId: targetUser.companyId || "",
      type: "manual_adjustment",
      amount: numericAmount,
      balanceAfter: nextBalance,
      note: String(note || "Yönetici tarafından manuel düzeltme."),
      createdByUserId: adminUser.id
    }, tx);

    // Create Audit Log
    await createAuditLog({
      companyId: adminUser.companyId,
      actorUserId: adminUser.id,
      action: "manual_wallet_adjustment",
      entityType: "user_wallet",
      entityId: targetUserId,
      message: `${adminUser.name}, ${targetUserId} ID'li kullanıcının bakiyesine ${numericAmount} TL manuel işlem yaptı.`
    }, tx);

    return nextBalance;
  });
}
