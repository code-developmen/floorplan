export interface MaterialOption {
  id: string;
  brand: string;
  name: string;
  hex: string; // for flat-color/luminosity recolor mode
}

export interface Category {
  id: string; // must match Region.categoryId
  label: string; // e.g. "Cabinet Finish"
  options: MaterialOption[];
}

export const categories: Category[] = [
  {
    id: "kitchen-slab",
    label: "Kitchen Slab",
    options: [
      { id: "slab-jet-black", brand: "Caesarstone", name: "Jet Black", hex: "#141414" },
      { id: "slab-soft-black", brand: "Caesarstone", name: "Soft Black", hex: "#3A3A3A" },
      { id: "slab-champagne", brand: "Silestone", name: "Champagne Gold", hex: "#D4AF37" },
      { id: "slab-antique-gold", brand: "Cambria", name: "Antique Gold", hex: "#A6843D" },
    ],
  },
  {
    id: "cabinet-finish",
    label: "Cabinet Finish",
    options: [
      { id: "cabinet-white-dove", brand: "Benjamin Moore", name: "White Dove", hex: "#F3F0E7" },
      { id: "cabinet-hale-navy", brand: "Benjamin Moore", name: "Hale Navy", hex: "#2C4158" },
      { id: "cabinet-sage", brand: "Sherwin-Williams", name: "Evergreen Fog", hex: "#6E7F71" },
      { id: "cabinet-cherry", brand: "Sherwin-Williams", name: "Cavern Clay", hex: "#8C4A3A" },
    ],
  },
  {
    id: "chimney-cover",
    label: "Chimney Cover",
    options: [
      { id: "chimney-stainless", brand: "Zephyr", name: "Brushed Stainless", hex: "#C5C8C6" },
      { id: "chimney-matte-black", brand: "Zephyr", name: "Matte Black", hex: "#2B2B2B" },
      { id: "chimney-white", brand: "Faber", name: "Gloss White", hex: "#F4F4F2" },
      { id: "chimney-bronze", brand: "ZLINE", name: "Champagne Bronze", hex: "#8A6A4F" },
    ],
  },
  {
    id: "drawer-finish",
    label: "Drawer Finish",
    options: [
      { id: "drawer-simply-white", brand: "Benjamin Moore", name: "Simply White", hex: "#F5F2EA" },
      { id: "drawer-kendall", brand: "Benjamin Moore", name: "Kendall Charcoal", hex: "#4E4F51" },
      { id: "drawer-alabaster", brand: "Sherwin-Williams", name: "Alabaster", hex: "#EDEAE0" },
      { id: "drawer-naval", brand: "Sherwin-Williams", name: "Naval", hex: "#2F3A4C" },
    ],
  },
];

export function findCategory(categoryId: string): Category | undefined {
  return categories.find((category) => category.id === categoryId);
}

export function findMaterial(materialId: string): MaterialOption | undefined {
  for (const category of categories) {
    const match = category.options.find((option) => option.id === materialId);
    if (match) return match;
  }
  return undefined;
}
