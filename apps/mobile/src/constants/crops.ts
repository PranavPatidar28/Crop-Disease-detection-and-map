export interface Crop {
  id: string;
  name: string;
  emoji: string;
  category: 'cereal' | 'pulse' | 'oilseed' | 'vegetable' | 'fruit' | 'cash' | 'spice' | 'beverage';
}

/**
 * Centralized crop catalog. Single source of truth — used by the upload form,
 * dashboard cards, and future analytics. Keep this list curated; don't let
 * arbitrary strings leak into report.cropType from the UI.
 */
export const CROPS: Crop[] = [
  { id: 'tomato', name: 'Tomato', emoji: '🍅', category: 'vegetable' },
  { id: 'potato', name: 'Potato', emoji: '🥔', category: 'vegetable' },
  { id: 'onion', name: 'Onion', emoji: '🧅', category: 'vegetable' },
  { id: 'chili', name: 'Chili', emoji: '🌶️', category: 'spice' },
  { id: 'cabbage', name: 'Cabbage', emoji: '🥬', category: 'vegetable' },
  { id: 'cauliflower', name: 'Cauliflower', emoji: '🥦', category: 'vegetable' },
  { id: 'brinjal', name: 'Brinjal', emoji: '🍆', category: 'vegetable' },
  { id: 'okra', name: 'Okra', emoji: '🌿', category: 'vegetable' },
  { id: 'rice', name: 'Rice', emoji: '🌾', category: 'cereal' },
  { id: 'wheat', name: 'Wheat', emoji: '🌾', category: 'cereal' },
  { id: 'maize', name: 'Maize', emoji: '🌽', category: 'cereal' },
  { id: 'bajra', name: 'Bajra', emoji: '🌾', category: 'cereal' },
  { id: 'jowar', name: 'Jowar', emoji: '🌾', category: 'cereal' },
  { id: 'soybean', name: 'Soybean', emoji: '🫘', category: 'pulse' },
  { id: 'groundnut', name: 'Groundnut', emoji: '🥜', category: 'oilseed' },
  { id: 'mustard', name: 'Mustard', emoji: '🌼', category: 'oilseed' },
  { id: 'cotton', name: 'Cotton', emoji: '🪴', category: 'cash' },
  { id: 'sugarcane', name: 'Sugarcane', emoji: '🎋', category: 'cash' },
  { id: 'banana', name: 'Banana', emoji: '🍌', category: 'fruit' },
  { id: 'mango', name: 'Mango', emoji: '🥭', category: 'fruit' },
  { id: 'grape', name: 'Grape', emoji: '🍇', category: 'fruit' },
  { id: 'apple', name: 'Apple', emoji: '🍎', category: 'fruit' },
  { id: 'pomegranate', name: 'Pomegranate', emoji: '🍎', category: 'fruit' },
  { id: 'coffee', name: 'Coffee', emoji: '☕', category: 'beverage' },
  { id: 'tea', name: 'Tea', emoji: '🍵', category: 'beverage' },
];

export const CROP_BY_ID = Object.fromEntries(CROPS.map((c) => [c.id, c]));
export const CROP_BY_NAME = Object.fromEntries(CROPS.map((c) => [c.name.toLowerCase(), c]));

export function findCropByName(name: string): Crop | undefined {
  return CROP_BY_NAME[name.toLowerCase()];
}
