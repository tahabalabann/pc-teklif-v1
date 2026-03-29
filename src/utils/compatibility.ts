import type { CatalogProduct } from "./api";

export interface CompatibilityWarning {
  category: string;
  message: string;
  type: "error" | "warning";
}

export const getSocket = (productName: string): string => {
  const lower = productName.toLowerCase();
  
  // AMD Sockets
  if (lower.includes("ryzen")) {
    if (/\b7[0-9]{3}|\b8[0-9]{3}|\b9[0-9]{3}/.test(lower)) return "AM5";
    return "AM4"; // Default for most Ryzens in catalog
  }
  
  // Intel Sockets
  if (lower.includes("lga1700") || /\b12[0-9]{3}|\b13[0-9]{3}|\b14[0-9]{3}/.test(lower)) return "LGA1700";
  if (lower.includes("lga1200") || /\b10[0-9]{3}|\b11[0-9]{3}/.test(lower)) return "LGA1200";
  
  // Motherboards
  if (/\ba320|\bb450|\bb550|\bx570/i.test(lower)) return "AM4";
  if (/\ba620|\bb650|\bx670/i.test(lower)) return "AM5";
  if (/\bh410|\bb460|\bz490|\bh510|\bb560|\bz590/i.test(lower)) return "LGA1200";
  if (/\bh610|\bb660|\bb760|\bz690|\bz790/i.test(lower)) return "LGA1700";

  return "Unknown";
};

export const getRamType = (productName: string): string => {
  if (productName.toUpperCase().includes("DDR5")) return "DDR5";
  if (productName.toUpperCase().includes("DDR4")) return "DDR4";
  
  // Motherboard detection for RAM
  if (/\ba620|\bb650|\bx670/i.test(productName)) return "DDR5";
  if (/\ba320|\bb450|\bb550|\bx570/i.test(productName)) return "DDR4";
  
  return "Unknown";
};

export const getWattageLimit = (productName: string): number => {
  const match = productName.match(/(\d+)\s*W/i);
  return match ? parseInt(match[1]) : 0;
};

export const estimateTDP = (productName: string, category: string): number => {
  const lower = productName.toLowerCase();
  
  if (category === "Islemci") {
    if (lower.includes("ryzen 9") || lower.includes("i9")) return 150;
    if (lower.includes("ryzen 7") || lower.includes("i7")) return 105;
    return 65; // Average
  }
  
  if (category === "Ekran Karti") {
    if (lower.includes("4090") || lower.includes("3090")) return 450;
    if (lower.includes("4080") || lower.includes("3080")) return 320;
    if (lower.includes("4070") || lower.includes("3070")) return 220;
    if (lower.includes("4060") || lower.includes("3060")) return 160;
    return 120;
  }
  
  return 0;
};

export const validateBuild = (selections: Record<string, CatalogProduct | null>): CompatibilityWarning[] => {
  const warnings: CompatibilityWarning[] = [];
  const cpu = selections["Islemci"];
  const mb = selections["Anakart"];
  const ram = selections["RAM"];
  const gpu = selections["Ekran Karti"];
  const psu = selections["Guc Kaynagi"];

  // 1. CPU & Motherboard Socket
  if (cpu && mb) {
    const cpuSocket = getSocket(cpu.name);
    const mbSocket = getSocket(mb.name);
    
    if (cpuSocket !== "Unknown" && mbSocket !== "Unknown" && cpuSocket !== mbSocket) {
      warnings.push({
        category: "Anakart",
        message: `İşlemci (${cpuSocket}) ile Anakart (${mbSocket}) soketleri uyumsuz!`,
        type: "error"
      });
    }
  }

  // 2. Motherboard & RAM Type
  if (mb && ram) {
    const mbRamType = getRamType(mb.name);
    const ramType = getRamType(ram.name);
    
    if (mbRamType !== "Unknown" && ramType !== "Unknown" && mbRamType !== ramType) {
      warnings.push({
        category: "RAM",
        message: `Anakart ${mbRamType} destekliyor, seçilen RAM ${ramType}!`,
        type: "error"
      });
    }
  }

  // 3. PSU Wattage
  if (psu) {
    const psuWattage = getWattageLimit(psu.name);
    let totalTdp = 50; // Base system
    if (cpu) totalTdp += estimateTDP(cpu.name, "Islemci");
    if (gpu) totalTdp += estimateTDP(gpu.name, "Ekran Karti");
    
    if (psuWattage > 0 && psuWattage < totalTdp) {
      warnings.push({
        category: "Guc Kaynagi",
        message: `Seçilen PSU (${psuWattage}W), sistem gereksinimi olan yaklaşık ${totalTdp}W için yetersiz kalabilir!`,
        type: "warning"
      });
    }
  }

  return warnings;
};

export const isProductCompatible = (product: CatalogProduct, selections: Record<string, CatalogProduct | null>): { compatible: boolean; reason?: string } => {
  const { category, name } = product;
  const cpu = selections["Islemci"];
  const mb = selections["Anakart"];
  const ram = selections["RAM"];
  const gpu = selections["Ekran Karti"];

  if (category === "Islemci" && mb) {
    const cpuSocket = getSocket(name);
    const mbSocket = getSocket(mb.name);
    if (cpuSocket !== "Unknown" && mbSocket !== "Unknown" && cpuSocket !== mbSocket) {
      return { compatible: false, reason: `Anakart ${mbSocket} soketine sahip.` };
    }
  }

  if (category === "Anakart") {
    if (cpu) {
      const mbSocket = getSocket(name);
      const cpuSocket = getSocket(cpu.name);
      if (mbSocket !== "Unknown" && cpuSocket !== "Unknown" && mbSocket !== cpuSocket) {
        return { compatible: false, reason: `İşlemci ${cpuSocket} soketine sahip.` };
      }
    }
    if (ram) {
      const mbRamType = getRamType(name);
      const ramType = getRamType(ram.name);
      if (mbRamType !== "Unknown" && ramType !== "Unknown" && mbRamType !== ramType) {
        return { compatible: false, reason: `RAM ${ramType} tipinde.` };
      }
    }
  }

  if (category === "RAM" && mb) {
    const ramType = getRamType(name);
    const mbRamType = getRamType(mb.name);
    if (ramType !== "Unknown" && mbRamType !== "Unknown" && ramType !== mbRamType) {
      return { compatible: false, reason: `Anakart ${mbRamType} destekliyor.` };
    }
  }
  
  if (category === "Guc Kaynagi") {
    const psuWattage = getWattageLimit(name);
    let totalTdp = 50;
    if (cpu) totalTdp += estimateTDP(cpu.name, "Islemci");
    if (gpu) totalTdp += estimateTDP(gpu.name, "Ekran Karti");
    
    if (psuWattage > 0 && psuWattage < totalTdp) {
      return { compatible: false, reason: `Sistem yaklaşık ${totalTdp}W gerektiriyor.` };
    }
  }

  return { compatible: true };
};
