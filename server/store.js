import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { sendEmail, emailTemplates } from "./utils/email.js";

const ownerScopedTables = new Set([
  "Quote",
  "AddressBookEntry",
  "SenderAddressBookEntry",
  "CompanyDirectoryEntry",
  "ShipmentRecord",
  "ProductCatalogEntry",
  "Notification",
]);

export function hashPassword(password, salt = randomUUID()) {
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
    balance: Number(row.balance || 0),
    isPlatformAdmin: Boolean(row.isPlatformAdmin || 0),
    isActive: Boolean(row.isActive ?? 1),
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
    paymentAccountName: row.paymentAccountName || "",
    paymentIban: row.paymentIban || "",
    notes: row.notes || "",
    createdAt: row.createdAt,
    isActive: Boolean(row.isActive ?? 1),
  };
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
  if (!user) {
    return null;
  }

  if (!Boolean(user.isActive ?? 1)) {
    return null;
  }

  if (user.companyId && !Boolean(user.companyIsActive ?? 1)) {
    return null;
  }

  return verifyPassword(password, user.passwordSalt, user.passwordHash) ? publicUser(user) : null;
}

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

  if (!rows[0]) {
    return;
  }

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
  if (!targetUser) {
    return;
  }

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
  if (!targetUser) {
    throw new Error("Kullanıcı bulunamadı.");
  }

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

export async function createSessionForUser(user) {
  const token = randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(); // 8 saat

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "Session" ("token", "userId", "createdAt", "lastSeenAt", "expiresAt")
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
  if (!row) {
    return null;
  }

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

export async function getDashboardSummaryForUser(user) {
  const todayPrefix = new Date().toISOString().slice(0, 10);

  const [products, quotes, shipments, pendingCountRows, lowBalanceCountRows] = await Promise.all([
    listProductsForUser(user),
    listQuotesForUser(user),
    listShipmentRecordsForUser(user),
    prisma.$queryRaw(
      Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "DepositRequest" d
        JOIN "User" requester ON requester."id" = d."requesterUserId"
        WHERE requester."companyId" = ${user.companyId} AND d."status" = 'pending'
      `,
    ),
    prisma.$queryRaw(
      Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "User"
        WHERE "companyId" = ${user.companyId}
          AND COALESCE("isActive", true) = true
          AND "role" != 'admin'
          AND COALESCE("balance", 0) < 150
      `,
    ),
  ]);

  const quoteShipmentsToday = quotes.filter(
    (item) => item?.geliverShipment && String(item.geliverShipment.createdAt || item.updatedAt || "").startsWith(todayPrefix),
  ).length;

  const lowStockCount = products.filter(p => {
    const stock = Number(p.stockCount ?? 0);
    const min = Number(p.minStockLevel ?? 0);
    return stock <= min && p.stockCount !== undefined;
  }).length;

  return {
    todayQuotes: quotes.filter((item) => String(item.createdAt || item.updatedAt || "").startsWith(todayPrefix)).length,
    todayShipments:
      shipments.filter((item) => String(item.createdAt || item.updatedAt || "").startsWith(todayPrefix)).length +
      quoteShipmentsToday,
    pendingDepositRequests: Number(pendingCountRows[0]?.count || 0),
    lowBalanceUsers: Number(lowBalanceCountRows[0]?.count || 0),
    lowStockCount,
  };
}

export async function getCompanyReportsForUser(user) {
  const organizations = user.isPlatformAdmin
    ? await listOrganizationsForPlatformAdmin()
    : (await listOrganizationsForPlatformAdmin()).filter((item) => item.id === user.companyId);

  const quoteRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT q."data" AS "data", u."companyId" AS "companyId"
      FROM "Quote" q
      JOIN "User" u ON u."id" = q."ownerUserId"
    `,
  );
  const shipmentRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT s."data" AS "data", u."companyId" AS "companyId"
      FROM "ShipmentRecord" s
      JOIN "User" u ON u."id" = s."ownerUserId"
    `,
  );
  const depositRows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT d."amount" AS "amount", d."status" AS "status", requester."companyId" AS "companyId"
      FROM "DepositRequest" d
      JOIN "User" requester ON requester."id" = d."requesterUserId"
    `,
  );

  return organizations.map((organization) => {
    const companyQuotes = quoteRows
      .filter((row) => row.companyId === organization.id)
      .map((row) => JSON.parse(row.data));
    const companyShipments = shipmentRows.filter((row) => row.companyId === organization.id);
    const quoteLinkedShipments = companyQuotes.filter((quote) => quote?.geliverShipment);
    const companyDeposits = depositRows.filter(
      (row) => row.companyId === organization.id && row.status === "approved",
    );
    const totalShipments = companyShipments.length + quoteLinkedShipments.length;
    const totalShippingCost = companyShipments.reduce((sum, row) => {
      const shipmentRecord = JSON.parse(row.data);
      return sum + Number(shipmentRecord?.shipment?.shipmentPrice || 0);
    }, 0) +
    quoteLinkedShipments.reduce((sum, quote) => sum + Number(quote?.geliverShipment?.shipmentPrice || 0), 0);

    const totalProfit = companyQuotes.reduce((sum, quote) => {
      const rows = Array.isArray(quote.rows) ? quote.rows : [];
      const sales = Number(quote.salesPrice || 0) || rows.reduce((rowSum, row) => rowSum + Number(row.salePrice || 0), 0);
      const costs =
        rows.reduce((rowSum, row) => rowSum + Number(row.purchasePrice || 0), 0) + Number(quote.costPrice || 0);
      return sum + (sales - costs);
    }, 0);

    return {
      companyId: organization.id,
      companyName: organization.companyName,
      totalQuotes: companyQuotes.length,
      totalShipments,
      totalShippingCost,
      averageShippingCost: totalShipments > 0 ? totalShippingCost / totalShipments : 0,
      totalDeposits: companyDeposits.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      totalProfit,
      userCount: organization.userCount,
      active: organization.isActive !== false,
    };
  });
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

export async function listQuotesForUser(user) {
  let query;
  if (user.isPlatformAdmin) {
    query = Prisma.sql`SELECT "data" FROM "Quote" ORDER BY "updatedAt" DESC`;
  } else if (user.companyId) {
    query = Prisma.sql`
      SELECT q."data" AS "data"
      FROM "Quote" q
      JOIN "User" u ON u."id" = q."ownerUserId"
      WHERE u."companyId" = ${user.companyId}
      ORDER BY q."updatedAt" DESC
    `;
  } else {
    query = Prisma.sql`
      SELECT "data" FROM "Quote"
      WHERE "ownerUserId" = ${user.id}
      ORDER BY "updatedAt" DESC
    `;
  }

  const rows = await prisma.$queryRaw(query);
  return rows.map((row) => JSON.parse(row.data));
}

export async function saveQuoteForUser(user, quote) {
  const now = new Date().toISOString();
  let payload = {
    ...quote,
    ownerUserId: user.id,
    updatedAt: now,
    createdAt: quote.createdAt || now,
  };

  // NEW: Manual stock deduction if admin sets status to Onaylandı / Tamamlandı
  if (
    (payload.status === "Onaylandı" || payload.status === "Tamamlandı") &&
    !payload.stockDeducted
  ) {
    try {
      await deductStockForQuote(payload);
      payload.stockDeducted = true;
    } catch (err) {
      console.error("Manual stock deduction failed:", err);
    }
  }

  if (user.companyId) {
    await assertOwnedByCompanyOrThrow("Quote", payload.id, user.companyId, "Bu teklif başka bir firmaya ait olduğu için güncellenemez.");
  }

  const existingRows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Quote" WHERE "id" = ${payload.id} LIMIT 1`
  );
  if (existingRows[0]) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "Quote"
        SET "data" = ${JSON.stringify(payload)}, "updatedAt" = ${payload.updatedAt}
        WHERE "id" = ${payload.id}
      `
    );

    // Notify Admin on significant status changes
    try {
      if (
        payload.status !== quote.status &&
        ["Onaylandı", "Tamamlandı", "Kargolandı"].includes(payload.status)
      ) {
        const org = await getOrganizationForUser(user);
        if (org.email) {
          const template = emailTemplates.adminStatusUpdate(payload.quoteNo, payload.customerName, payload.status);
          await sendEmail({ to: org.email, ...template });
        }
      }
    } catch (e) {
      console.error("Admin status notification failed:", e);
    }
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "Quote" ("id", "ownerUserId", "data", "createdAt", "updatedAt")
        VALUES (${payload.id}, ${user.id}, ${JSON.stringify(payload)}, ${payload.createdAt}, ${payload.updatedAt})
      `
    );
  }

  await createAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: existingRows[0] ? "quote_updated" : "quote_created",
    entityType: "quote",
    entityId: payload.id,
    message: `${user.name} bir teklif ${existingRows[0] ? "güncelledi" : "oluşturdu"}.`,
  });

  return payload;
}

export async function deleteQuoteForUser(user, quoteId) {
  const row = await getOwnerScopedRow("Quote", quoteId);
  if (!row || row.companyId !== user.companyId) {
    return;
  }

  await prisma.$executeRaw(Prisma.sql`DELETE FROM "Quote" WHERE "id" = ${quoteId}`);
}

export async function createQuoteFromBuilder(user, selections) {
  const now = new Date().toISOString();
  const quoteId = randomUUID();
  const quoteNo = `PC-${Date.now().toString().slice(-6)}`;
  
  // selections is a map of category -> productId
  const productIds = Object.values(selections);
  const products = await prisma.$queryRaw(
    Prisma.sql`SELECT "id", "data" FROM "ProductCatalogEntry" WHERE "id" IN (${Prisma.join(productIds)})`
  );

  const rows = products.map(p => {
    const data = JSON.parse(p.data);
    return {
      id: randomUUID(),
      catalogItemId: p.id,
      name: data.name,
      quantity: 1,
      purchasePrice: Number(data.purchasePrice || 0),
      purchaseCurrency: data.purchaseCurrency || "USD",
      salePrice: Number(data.salePrice || 0),
      saleCurrency: data.saleCurrency || "USD",
      imageUrl: data.imageUrl || ""
    };
  });

  const totalSale = rows.reduce((sum, r) => sum + Number(r.salePrice || 0), 0);

  const quote = {
    id: quoteId,
    quoteNo,
    ownerUserId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    status: "Onay Bekliyor",
    date: now.split("T")[0],
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    rows,
    salesPrice: totalSale,
    saleCurrency: "USD", // Default
    notes: "PC Builder üzerinden oluşturuldu.",
    createdAt: now,
    updatedAt: now
  };

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "Quote" ("id", "ownerUserId", "data", "createdAt", "updatedAt")
      VALUES (${quote.id}, ${user.id}, ${JSON.stringify(quote)}, ${quote.createdAt}, ${quote.updatedAt})
    `
  );

  // Notify Admin about new web quote
  try {
    const org = await getOrganizationForUser(user);
    if (org.email) {
      const template = emailTemplates.adminNewQuote(quote.quoteNo, quote.customerName);
      await sendEmail({ to: org.email, ...template });
    }
  } catch (e) {
    console.error("Admin new quote notification failed:", e);
  }

  return quote;
}

export async function getPublicQuoteById(id) {
  const rows = await prisma.$queryRaw(Prisma.sql`SELECT "data" FROM "Quote" WHERE "id" = ${id} LIMIT 1`);
  if (!rows[0]) return null;
  const quote = JSON.parse(rows[0].data);
  
  // Sanitize: Remove sensitive info for public view
  if (quote.rows) {
    quote.rows = quote.rows.map(row => {
      const { 
        purchasePrice, 
        purchaseCurrency, 
        margin, 
        profit, 
        ...sanitized 
      } = row;
      return sanitized;
    });
  }
  
  // Remove overall totals if they include profit/margin
  delete quote.totalProfit;
  delete quote.averageMargin;
  
  return quote;
}

export async function updatePublicQuoteStatus(id, status, customerNote = "") {
  const quoteRows = await prisma.$queryRaw(Prisma.sql`SELECT "data" FROM "Quote" WHERE "id" = ${id} LIMIT 1`);
  if (!quoteRows[0]) throw new Error("Teklif bulunamadı.");
  const quote = JSON.parse(quoteRows[0].data);
  
  const now = new Date().toISOString();
  quote.status = status;
  quote.updatedAt = now;
  quote.customerNote = String(customerNote || "").trim();

  if (status === "Onaylandı") {
    quote.customerApprovedAt = now;
    
    // Suggestion 5: Deduct stock from catalog
    try {
      if (!quote.stockDeducted) {
        await deductStockForQuote(quote);
        quote.stockDeducted = true;
      }
    } catch (err) {
      console.error("Stock deduction failed:", err);
      // We still update the status even if stock deduction fails, but we log it
    }
  } else if (status === "Reddedildi") {
    quote.customerRejectedAt = now;
  }
  
  await prisma.$executeRaw(
    Prisma.sql`UPDATE "Quote" SET "data" = ${JSON.stringify(quote)}, "updatedAt" = ${quote.updatedAt} WHERE "id" = ${id}`
  );

  // Trigger notification for admin
  const userRows = await prisma.$queryRaw(Prisma.sql`SELECT "ownerUserId" FROM "Quote" WHERE "id" = ${id} LIMIT 1`);
  if (userRows[0]) {
    await createNotificationForUser(userRows[0].ownerUserId, {
      type: "quote_status",
      title: `Teklif ${status}`,
      message: `"${quote.quoteNo}" numaralı teklif müşteri tarafından ${status.toLowerCase()} olarak işaretlendi.`,
      quoteId: id
    });

    // Notify Admin via Email
    try {
      const orgRows = await prisma.$queryRaw(
        Prisma.sql`SELECT o."email" FROM "Organization" o JOIN "User" u ON u."companyId" = o."id" WHERE u."id" = ${userRows[0].ownerUserId} LIMIT 1`
      );
      if (orgRows[0]?.email) {
        const template = emailTemplates.adminStatusUpdate(quote.quoteNo, quote.customerName, status);
        await sendEmail({ to: orgRows[0].email, ...template });
      }
    } catch (e) {
      console.error("Admin public status email failed:", e);
    }
  }
  
  return quote;
}

async function deductStockForQuote(quote) {
  if (!quote.rows || quote.rows.length === 0) return;

  for (const row of quote.rows) {
    // Only deduct if it's a catalog product (we usually store catalogItemId in the row)
    // Looking at the data, we might need to match by name/model if ID isn't there
    const catalogId = row.catalogItemId || row.id; 
    
    const productRows = await prisma.$queryRaw(
      Prisma.sql`SELECT "id", "data" FROM "ProductCatalogEntry" WHERE "id" = ${catalogId} LIMIT 1`
    );

    if (productRows[0]) {
      const productData = JSON.parse(productRows[0].data);
      const currentStock = Number(productData.stockCount || 0);
      const quantity = Number(row.quantity || 1);
      
      productData.stockCount = Math.max(0, currentStock - quantity);
      productData.updatedAt = new Date().toISOString();

      await prisma.$executeRaw(
        Prisma.sql`UPDATE "ProductCatalogEntry" SET "data" = ${JSON.stringify(productData)}, "updatedAt" = ${productData.updatedAt} WHERE "id" = ${catalogId}`
      );

      // Notify if below critical level
      const minStock = Number(productData.minStockLevel || 0);
      if (productData.stockCount <= minStock) {
        const ownerRows = await prisma.$queryRaw(Prisma.sql`SELECT "ownerUserId" FROM "ProductCatalogEntry" WHERE "id" = ${catalogId} LIMIT 1`);
        if (ownerRows[0]) {
          await createNotificationForUser(ownerRows[0].ownerUserId, {
            type: "low_stock",
            title: "Kritik Stok Uyarısı",
            message: `"${productData.name}" ürünü kritik stok seviyesine (${productData.stockCount}) düştü.`,
            productId: catalogId
          });
        }
      }
    }
  }
}

export async function listPublicProducts() {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT "data" FROM "ProductCatalogEntry" ORDER BY "updatedAt" DESC`
  );
  return rows.map((row) => JSON.parse(row.data));
}

export async function listAddressBookForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT a."id", a."label", a."data", a."createdAt", a."updatedAt"
      FROM "AddressBookEntry" a
      JOIN "User" u ON u."id" = a."ownerUserId"
      WHERE u."companyId" = ${user.companyId}
      ORDER BY a."updatedAt" DESC
    `,
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

  const existingRows = await prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "AddressBookEntry" WHERE "id" = ${payload.id} LIMIT 1`);
  if (existingRows[0]) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "AddressBookEntry"
        SET "label" = ${payload.label}, "data" = ${JSON.stringify(payload.recipient)}, "updatedAt" = ${payload.updatedAt}
        WHERE "id" = ${payload.id}
      `
    );
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "AddressBookEntry" ("id", "ownerUserId", "label", "data", "createdAt", "updatedAt")
        VALUES (${payload.id}, ${payload.ownerUserId}, ${payload.label}, ${JSON.stringify(payload.recipient)}, ${payload.createdAt}, ${payload.updatedAt})
      `
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

  await prisma.$executeRaw(Prisma.sql`DELETE FROM "AddressBookEntry" WHERE "id" = ${addressId}`);
}

export async function listSenderAddressBookForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT a."id", a."label", a."data", a."createdAt", a."updatedAt"
      FROM "SenderAddressBookEntry" a
      JOIN "User" u ON u."id" = a."ownerUserId"
      WHERE u."companyId" = ${user.companyId}
      ORDER BY a."updatedAt" DESC
    `,
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

  const existingRows = await prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "SenderAddressBookEntry" WHERE "id" = ${payload.id} LIMIT 1`);
  if (existingRows[0]) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "SenderAddressBookEntry"
        SET "label" = ${payload.label}, "data" = ${JSON.stringify(payload.recipient)}, "updatedAt" = ${payload.updatedAt}
        WHERE "id" = ${payload.id}
      `
    );
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "SenderAddressBookEntry" ("id", "ownerUserId", "label", "data", "createdAt", "updatedAt")
        VALUES (${payload.id}, ${payload.ownerUserId}, ${payload.label}, ${JSON.stringify(payload.recipient)}, ${payload.createdAt}, ${payload.updatedAt})
      `
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

  await prisma.$executeRaw(Prisma.sql`DELETE FROM "SenderAddressBookEntry" WHERE "id" = ${addressId}`);
}

export async function listCompaniesForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT c."data" AS "data"
      FROM "CompanyDirectoryEntry" c
      JOIN "User" u ON u."id" = c."ownerUserId"
      WHERE u."companyId" = ${user.companyId}
      ORDER BY c."updatedAt" DESC
    `,
  );

  return rows.map((row) => JSON.parse(row.data));
}

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

  await assertOwnedByCompanyOrThrow("ShipmentRecord", payload.id, user.companyId, "Bu kargo kaydı başka bir firmaya ait.");

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

export async function saveCompanyForUser(user, company) {
  const now = new Date().toISOString();
  const payload = {
    ...company,
    id: company.id || randomUUID(),
    createdAt: company.createdAt || now,
    updatedAt: now,
  };

  await assertOwnedByCompanyOrThrow("CompanyDirectoryEntry", payload.id, user.companyId, "Bu firma kaydı başka bir firmaya ait.");

  const existingRows = await prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "CompanyDirectoryEntry" WHERE "id" = ${payload.id} LIMIT 1`);
  if (existingRows[0]) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "CompanyDirectoryEntry"
        SET "data" = ${JSON.stringify(payload)}, "updatedAt" = ${payload.updatedAt}
        WHERE "id" = ${payload.id}
      `
    );
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "CompanyDirectoryEntry" ("id", "ownerUserId", "data", "createdAt", "updatedAt")
        VALUES (${payload.id}, ${user.id}, ${JSON.stringify(payload)}, ${payload.createdAt}, ${payload.updatedAt})
      `
    );
  }

  return payload;
}

export async function deleteShipmentRecordForUser(user, shipmentId) {
  const row = await getOwnerScopedRow("ShipmentRecord", shipmentId);
  if (!row || row.companyId !== user.companyId) {
    return;
  }

  await prisma.$executeRaw(Prisma.sql`DELETE FROM "ShipmentRecord" WHERE "id" = ${shipmentId}`);
}

export async function deleteCompanyForUser(user, companyId) {
  const row = await getOwnerScopedRow("CompanyDirectoryEntry", companyId);
  if (!row || row.companyId !== user.companyId) {
    return;
  }

  await prisma.$executeRaw(Prisma.sql`DELETE FROM "CompanyDirectoryEntry" WHERE "id" = ${companyId}`);
}

export async function disconnectStore() {
  await prisma.$disconnect();
}

export async function createManualWalletAdjustment(currentUser, { userId, amount, note }) {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount === 0) {
    throw new Error("Tutar sıfır olamaz.");
  }

  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT "id", "companyId"
      FROM "User"
      WHERE "id" = ${userId}
      LIMIT 1
    `,
  );

  const targetUser = rows[0];
  if (!targetUser) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  if (!currentUser.isPlatformAdmin && targetUser.companyId !== currentUser.companyId) {
    throw new Error("Bu kullanıcı başka bir firmaya ait.");
  }

  await prisma.$executeRaw(
    Prisma.sql`UPDATE "User" SET "balance" = COALESCE("balance", 0) + ${numericAmount} WHERE "id" = ${userId}`,
  );

  const nextBalance = await getUserBalance(userId);
  await createWalletLedgerEntry({
    userId,
    companyId: targetUser.companyId,
    type: numericAmount > 0 ? "manual_credit" : "manual_debit",
    amount: numericAmount,
    balanceAfter: nextBalance,
    note: String(note || "").trim() || "Manuel bakiye işlemi",
    createdByUserId: currentUser.id,
  });
  await createAuditLog({
    companyId: targetUser.companyId,
    actorUserId: currentUser.id,
    action: "wallet_adjusted",
    entityType: "wallet",
    entityId: userId,
    message: `${currentUser.name} manuel bakiye işlemi yaptı.`,
  });

  return nextBalance;
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

async function getDepositRequestRowForCompany(companyId, requestId) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        d."id" AS "id",
        d."requesterUserId" AS "requesterUserId",
        requester."companyId" AS "companyId",
        d."amount" AS "amount",
        d."status" AS "status"
      FROM "DepositRequest" d
      JOIN "User" requester ON requester."id" = d."requesterUserId"
      WHERE d."id" = ${requestId}
      LIMIT 1
    `,
  );

  const row = rows[0] || null;
  if (!row || row.companyId !== companyId) {
    return null;
  }

  return row;
}

async function createNotificationForUser(userId, payload, db = prisma) {
  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO "Notification" ("id", "ownerUserId", "data", "readAt", "createdAt")
      VALUES (${randomUUID()}, ${userId}, ${JSON.stringify(payload)}, ${null}, ${new Date().toISOString()})
    `,
  );
}

async function createWalletLedgerEntry({
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

async function createAuditLog({ companyId, actorUserId, action, entityType, entityId, message, data = {} }, db = prisma) {
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

async function createCompanyAdminNotifications(companyId, payload) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT "id"
      FROM "User"
      WHERE "companyId" = ${companyId} AND "role" = 'admin'
    `,
  );

  await Promise.all(rows.map((row) => createNotificationForUser(row.id, payload)));
}

async function getDepositRequestByIdForCompany(companyId, requestId) {
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

async function getOwnerScopedRow(tableName, recordId) {
  if (!ownerScopedTables.has(tableName)) {
    throw new Error(`Unsupported owner-scoped table: ${tableName}`);
  }

  // Use explicit per-table queries to avoid $queryRawUnsafe entirely
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

async function assertOwnedByCompanyOrThrow(tableName, recordId, companyId, message) {
  const row = await getOwnerScopedRow(tableName, recordId);
  if (row && row.companyId !== companyId) {
    throw new Error(message);
  }
}

// ============================================================================
// Product Catalog (Ürün Kataloğu)
// ============================================================================

export async function listProductsForUser(user) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT p."id", p."data", p."createdAt", p."updatedAt"
      FROM "ProductCatalogEntry" p
      JOIN "User" u ON u."id" = p."ownerUserId"
      WHERE u."companyId" = ${user.companyId}
      ORDER BY p."updatedAt" DESC
    `,
  );

  return rows.map((row) => ({
    ...JSON.parse(row.data),
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function saveProductForUser(user, product) {
  const now = new Date().toISOString();
  const id = product.id || randomUUID();
  const payload = {
    ...product,
    id,
    createdAt: product.createdAt || now,
    updatedAt: now,
  };

  await assertOwnedByCompanyOrThrow("ProductCatalogEntry", payload.id, user.companyId, "Bu ürün başka bir firmaya ait.");

  const existingRows = await prisma.$queryRaw(
    Prisma.sql`SELECT "id" FROM "ProductCatalogEntry" WHERE "id" = ${payload.id} LIMIT 1`
  );
  if (existingRows[0]) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "ProductCatalogEntry"
        SET "data" = ${JSON.stringify(payload)}, "updatedAt" = ${payload.updatedAt}
        WHERE "id" = ${payload.id}
      `
    );
  } else {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "ProductCatalogEntry" ("id", "ownerUserId", "data", "createdAt", "updatedAt")
        VALUES (${payload.id}, ${user.id}, ${JSON.stringify(payload)}, ${payload.createdAt}, ${payload.updatedAt})
      `
    );
  }

  return payload;
}

export async function deleteProductForUser(user, productId) {
  const row = await getOwnerScopedRow("ProductCatalogEntry", productId);
  if (!row || row.companyId !== user.companyId) {
    return;
  }

  await prisma.$executeRaw(Prisma.sql`DELETE FROM "ProductCatalogEntry" WHERE "id" = ${productId}`);
}
