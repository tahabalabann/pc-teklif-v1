import type { AppUser } from "../types/quote";
import type { AppRoute } from "../hooks/useHashRoute";

export const roleRouteAccess: Record<AppUser["role"], AppRoute[]> = {
  admin: ["dashboard", "quotes", "quote-detail", "shipping", "companies", "products", "accounting", "settings", "platform", "storefront"],
  accounting: ["companies", "accounting"],
  operations: ["quotes", "quote-detail", "shipping", "companies", "products"],
  shipping: ["shipping", "companies"],
  sales: ["quotes", "quote-detail", "companies", "products"],
  staff: ["quotes", "quote-detail", "shipping", "companies", "products"],
  customer: ["customer"],
};

export function canAccessRoute(user: AppUser, route: AppRoute) {
  return roleRouteAccess[user.role].includes(route);
}
