import crypto from "crypto";
import { prisma } from "../db.js";

export async function listFeaturedSystems() {
  return await prisma.featuredSystem.findMany({
    orderBy: { createdAt: "asc" }
  });
}

export async function createFeaturedSystem({ name, category, price, specs, badge }) {
  const now = new Date().toISOString();
  return await prisma.featuredSystem.create({
    data: {
      id: crypto.randomUUID(),
      name,
      category: category || "",
      price: price.toString(),
      specs: JSON.stringify(specs), 
      badge: badge || null,
      createdAt: now,
      updatedAt: now
    }
  });
}

export async function updateFeaturedSystem(id, { name, category, price, specs, badge }) {
  return await prisma.featuredSystem.update({
    where: { id },
    data: {
      name,
      category,
      price: price?.toString(),
      specs: specs ? JSON.stringify(specs) : undefined,
      badge: badge !== undefined ? badge : null,
      updatedAt: new Date().toISOString()
    }
  });
}

export async function deleteFeaturedSystem(id) {
  return await prisma.featuredSystem.delete({
    where: { id }
  });
}
