import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";
import { listProductsForUser } from "./quoteService.js";
import { listQuotesForUser } from "./quoteService.js";
import { listShipmentRecordsForUser } from "./shippingService.js";
import { listDepositRequestsForUser } from "./walletService.js";
import { listNotificationsForUser } from "./notificationService.js";
import { listOrganizationsForPlatformAdmin } from "./organizationService.js";

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

  // OPTIMIZATION: Instead of fetching all then filtering, we should query by companyId if not platform admin
  // But for now, let's keep the existing logic and I will optimize it later with a dedicated PR if needed or as part of bugs/cleanup.
  
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
