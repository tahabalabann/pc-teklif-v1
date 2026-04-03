export interface FeaturedSystem {
  id: string;
  name: string;
  category: string;
  price: string;
  specs: string; // JSON string from DB, will be parsed later
  badge: string | null;
  condition: string;
  createdAt: string;
  updatedAt: string;
}

// Extends for frontend usage where specs are parsed as array
export interface FrontendFeaturedSystem extends Omit<FeaturedSystem, 'specs'> {
  specs: string[];
}
