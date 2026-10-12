/** App-wide constants (no React imports; icon names are mapped to Lucide components in the UI layer). */

export const MAX_PAISE = 1_000_000_000; // ₹1,00,00,000.00 maximum per expense

export const CATEGORIES = [
  'Groceries', 'Rent', 'Electricity', 'Wi-Fi',
  'Food', 'Household supplies', 'Transport', 'Other',
];

/** Lucide icon name per category (resolved in components/common/Avatar.jsx → CategoryIcon). */
export const CATEGORY_ICONS = {
  Groceries: 'ShoppingBasket',
  Rent: 'KeyRound',
  Electricity: 'Zap',
  'Wi-Fi': 'Wifi',
  Food: 'UtensilsCrossed',
  'Household supplies': 'SprayCan',
  Transport: 'Bus',
  Other: 'Sparkles',
};

/** Avatar palettes. A roommate stores an index into each list. */
export const AVATAR_COLORS = [
  { name: 'Teal', hex: '#0f9d8f' },
  { name: 'Coral', hex: '#ff7a59' },
  { name: 'Lavender', hex: '#8b7bff' },
  { name: 'Sunny', hex: '#e9a800' },
  { name: 'Pink', hex: '#ec5fa0' },
  { name: 'Sky', hex: '#3b9cf5' },
];
export const AVATAR_ICONS = ['Cat', 'Dog', 'Rabbit', 'Bird', 'Fish', 'Squirrel'];

/** First-visit defaults. IDs are stable forever; rounding priority is the sorted ID. */
export const DEFAULT_ROOMMATES = [
  { id: 'roommate-a', name: 'A', color: 0, icon: 0 },
  { id: 'roommate-b', name: 'B', color: 1, icon: 1 },
  { id: 'roommate-c', name: 'C', color: 2, icon: 2 },
];

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'roomieSplitData';
