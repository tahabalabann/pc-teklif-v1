import type { AppUser } from "../types/quote";

export const roleRouteAccess: Record<
  AppUser["role"],
  Array<"dashboard" | "quotes" | "quote-detail" | "shipping" | "companies" | "accounting" | "settings">
> = {
  admin: ["dashboard", "quotes", "quote-detail", "shipping", "companies", "accounting", "settings"],
  accounting: ["companies", "accounting"],
  operations: ["quotes", "quote-detail", "shipping", "companies"],
  shipping: ["shipping", "companies"],
  sales: ["quotes", "quote-detail", "companies"],
  staff: ["quotes", "quote-detail", "shipping", "companies"],
};

export function canAccessRoute(
  user: AppUser,
  route: "dashboard" | "quotes" | "quote-detail" | "shipping" | "companies" | "accounting" | "settings",
) {
  return roleRouteAccess[user.role].includes(route);
}
