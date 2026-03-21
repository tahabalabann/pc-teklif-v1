/**
 * Shared helper / utility functions used across the server.
 */

export function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `+90${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+9${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("90")) {
    return `+${digits}`;
  }
  return digits ? `+${digits}` : "";
}

export function normalizeTurkishLocationName(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "";
  }

  const replacements = [
    [/Istanbul/gi, "İstanbul"],
    [/Izmir/gi, "İzmir"],
    [/Cekmekoy/gi, "Çekmeköy"],
    [/Gungoren/gi, "Güngören"],
    [/Besiktas/gi, "Beşiktaş"],
    [/Sisli/gi, "Şişli"],
    [/Kadikoy/gi, "Kadıköy"],
    [/Uskudar/gi, "Üsküdar"],
  ];

  let normalized = source;
  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  if (normalized === normalized.toUpperCase()) {
    normalized = normalized
      .toLocaleLowerCase("tr-TR")
      .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("tr-TR"));
  }

  return normalized;
}

export function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return { message: value };
  }
}

export function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
