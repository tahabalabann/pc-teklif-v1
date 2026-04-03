import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { assertOwnedByRecordOwnerOrThrow, getOwnerScopedRow } from "./common.js";
import { createAuditLog } from "./auditService.js";
import { createNotificationForUser } from "./notificationService.js";
import { getOrganizationForUser } from "./organizationService.js";

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

  // Stock deduction if admin sets status to Onaylandı / Tamamlandı
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

  await assertOwnedByRecordOwnerOrThrow("Quote", payload.id, user, "Bu teklif size veya firmanıza ait değil.");
  
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
  if (!row) return;

  if (!user.isPlatformAdmin) {
    if (user.companyId) {
      if (row.companyId !== user.companyId) return;
    } else {
      if (row.ownerUserId !== user.id) return;
    }
  }

  await prisma.$executeRaw(Prisma.sql`DELETE FROM "Quote" WHERE "id" = ${quoteId}`);
}

export async function createQuoteFromBuilder(user, selections) {
  const now = new Date().toISOString();
  const quoteId = randomUUID();
  const quoteNo = `PC-${Date.now().toString().slice(-6)}`;
  
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
      imageUrl: data.imageUrl || "",
      condition: data.condition || "new"
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
    saleCurrency: "USD",
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
  
  if (quote.rows) {
    quote.rows = quote.rows.map(row => {
      const { purchasePrice, purchaseCurrency, margin, profit, ...sanitized } = row;
      return sanitized;
    });
  }
  
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
    try {
      if (!quote.stockDeducted) {
        await deductStockForQuote(quote);
        quote.stockDeducted = true;
      }
    } catch (err) {
      console.error("Stock deduction failed:", err);
    }
  } else if (status === "Reddedildi") {
    quote.customerRejectedAt = now;
  }
  
  await prisma.$executeRaw(
    Prisma.sql`UPDATE "Quote" SET "data" = ${JSON.stringify(quote)}, "updatedAt" = ${quote.updatedAt} WHERE "id" = ${id}`
  );

  const userRows = await prisma.$queryRaw(Prisma.sql`SELECT "ownerUserId" FROM "Quote" WHERE "id" = ${id} LIMIT 1`);
  if (userRows[0]) {
    await createNotificationForUser(userRows[0].ownerUserId, {
      type: "quote_status",
      title: `Teklif ${status}`,
      message: `"${quote.quoteNo}" numaralı teklif müşteri tarafından ${status.toLowerCase()} olarak işaretlendi.`,
      quoteId: id
    });

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

  await assertOwnedByRecordOwnerOrThrow("ProductCatalogEntry", payload.id, user, "Bu ürün başka bir firmaya ait.");

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
  if (!row) return;

  if (!user.isPlatformAdmin) {
    if (user.companyId) {
      if (row.companyId !== user.companyId) return;
    } else {
      if (row.ownerUserId !== user.id) return;
    }
  }

  await prisma.$executeRaw(Prisma.sql`DELETE FROM "ProductCatalogEntry" WHERE "id" = ${productId}`);
}

export async function listPublicProducts() {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT "data" FROM "ProductCatalogEntry" ORDER BY "updatedAt" DESC`
  );
  return rows.map((row) => JSON.parse(row.data));
}

async function deductStockForQuote(quote) {
  if (!quote.rows || quote.rows.length === 0) return;

  for (const row of quote.rows) {
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
