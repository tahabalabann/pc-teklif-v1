import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const CATEGORY_MAP = [
  { name: "İşlemci", keywords: ["Core i3", "Core i5", "Core i7", "Core i9", "Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9", "AMD Ryzen", "Intel Core"] },
  { name: "Ekran Kartı", keywords: ["RTX", "GTX", "Radeon", "RX", "Graphics", "NVIDIA", "AMD Radeon"] },
  { name: "Anakart", keywords: ["Anakart", "Motherboard", "B450", "B550", "X570", "Z690", "Z790", "H610", "B660", "B760", "A320", "A520"] },
  { name: "Bellek", keywords: ["RAM", "Memory", "DDR4", "DDR5", "8GB", "16GB", "32GB", "G.Skill", "Corsair", "Kingston", "Ballistix"] },
  { name: "Depolama", keywords: ["SSD", "NVMe", "Hard Drive", "HDD", "1TB", "500GB", "2TB", "Samsung 980", "Kingston NV", "Kingston A400", "Crucial BX"] },
  { name: "Güç Kaynağı", keywords: ["PSU", "Power Supply", "Watt", "80+", "Bronze", "Gold", "Modular", "Corsair RM", "Cooler Master MWE"] },
  { name: "Kasa", keywords: ["Case", "Kasa", "Tower", "ATX", "Micro-ATX", "Cooler Master", "Thermaltake", "NZXT", "Corsair 4000D", "MSI MAG"] },
  { name: "İşlemci Soğutucu", keywords: ["Cooler", "Soğutucu", "Fan", "Liquid", "Air Cooler", "Noctua", "Be Quiet", "H100i", "Kraken"] },
];

async function categorize() {
  try {
    const products = await prisma.productCatalogEntry.findMany();
    console.log(`Found ${products.length} products to categorize.`);

    for (const product of products) {
      const data = JSON.parse(product.data);
      const searchStr = `${data.name} ${data.description || ""}`.toLowerCase();
      
      let matchedCategory = data.category;
      
      for (const cat of CATEGORY_MAP) {
        if (cat.keywords.some(kw => searchStr.includes(kw.toLowerCase()))) {
          matchedCategory = cat.name;
          break;
        }
      }

      if (matchedCategory !== data.category) {
        data.category = matchedCategory;
        await prisma.productCatalogEntry.update({
          where: { id: product.id },
          data: { data: JSON.stringify(data) }
        });
        console.log(`Categorized: "${data.name}" -> ${matchedCategory}`);
      }
    }
    
    console.log("Categorization complete.");
  } catch (error) {
    console.error("Categorization failed:", error);
  }
}

categorize().finally(() => prisma.$disconnect());
