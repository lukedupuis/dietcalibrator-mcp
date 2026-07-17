/**
 * Bundled starter foods (the shared "Foods table"). Macros are grams per one
 * serving of the stated size; calories are derived at load time via the Atwater
 * factors, so this file only carries the four fields a human would actually
 * type in. Values are typical label figures, good enough to demo the engine.
 *
 * This is what lets the server run cold — no database, no credentials.
 */
export interface SeedFood {
  name: string;
  srvSize: number;
  srvType: string;
  fats: number;
  carbs: number;
  prots: number;
}

export const SEED_FOODS: SeedFood[] = [
  { name: "Chicken breast, cooked", srvSize: 100, srvType: "g", fats: 3.6, carbs: 0, prots: 31 },
  { name: "Salmon, cooked", srvSize: 100, srvType: "g", fats: 13, carbs: 0, prots: 25 },
  { name: "Ground beef, 85% lean, cooked", srvSize: 100, srvType: "g", fats: 15, carbs: 0, prots: 26 },
  { name: "Large egg", srvSize: 1, srvType: "egg", fats: 5, carbs: 0.6, prots: 6 },
  { name: "Whole milk", srvSize: 1, srvType: "cup", fats: 8, carbs: 12, prots: 8 },
  { name: "Greek yogurt, plain nonfat", srvSize: 170, srvType: "g", fats: 0, carbs: 6, prots: 17 },
  { name: "Cheddar cheese", srvSize: 28, srvType: "g", fats: 9, carbs: 0.4, prots: 7 },
  { name: "White rice, cooked", srvSize: 1, srvType: "cup", fats: 0.4, carbs: 45, prots: 4 },
  { name: "Brown rice, cooked", srvSize: 1, srvType: "cup", fats: 1.8, carbs: 45, prots: 5 },
  { name: "Oats, dry", srvSize: 40, srvType: "g", fats: 3, carbs: 27, prots: 5 },
  { name: "Whole wheat bread", srvSize: 1, srvType: "slice", fats: 1, carbs: 12, prots: 4 },
  { name: "Pasta, cooked", srvSize: 1, srvType: "cup", fats: 1.1, carbs: 43, prots: 8 },
  { name: "Sweet potato, baked", srvSize: 1, srvType: "medium", fats: 0.2, carbs: 24, prots: 2 },
  { name: "Black beans, cooked", srvSize: 1, srvType: "cup", fats: 0.9, carbs: 41, prots: 15 },
  { name: "Broccoli, cooked", srvSize: 1, srvType: "cup", fats: 0.6, carbs: 11, prots: 4 },
  { name: "Spinach, raw", srvSize: 1, srvType: "cup", fats: 0.1, carbs: 1.1, prots: 0.9 },
  { name: "Avocado", srvSize: 0.5, srvType: "fruit", fats: 15, carbs: 9, prots: 2 },
  { name: "Banana", srvSize: 1, srvType: "medium", fats: 0.4, carbs: 27, prots: 1.3 },
  { name: "Apple", srvSize: 1, srvType: "medium", fats: 0.3, carbs: 25, prots: 0.5 },
  { name: "Blueberries", srvSize: 1, srvType: "cup", fats: 0.5, carbs: 21, prots: 1.1 },
  { name: "Almonds", srvSize: 28, srvType: "g", fats: 14, carbs: 6, prots: 6 },
  { name: "Peanut butter", srvSize: 2, srvType: "tbsp", fats: 16, carbs: 7, prots: 8 },
  { name: "Olive oil", srvSize: 1, srvType: "tbsp", fats: 14, carbs: 0, prots: 0 },
  { name: "Whey protein powder", srvSize: 1, srvType: "scoop", fats: 1.5, carbs: 3, prots: 24 },
];
