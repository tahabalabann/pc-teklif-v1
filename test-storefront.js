import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!user) return console.log("No admin found");
  
  const session = await prisma.session.findFirst({ where: { userId: user.id } });
  if (!session) return console.log("No session found for admin");

  const token = session.token;
  console.log("Found token:", token.substring(0, 10) + "...");

  const res = await fetch("http://localhost:8787/api/storefront/featured-systems", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      name: "Test System",
      category: "Test",
      price: "100",
      specs: ["1", "2"],
      badge: "Test"
    })
  });

  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
test().catch(console.error);
