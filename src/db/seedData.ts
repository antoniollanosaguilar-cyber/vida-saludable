import { db } from './database';
import type {
  ComboIngredient,
  CookState,
  DayMenuTemplate,
  DayTemplateEntry,
  FoodItem,
  MealCombo,
  UserProfile,
} from '../types/models';
import { normalizeSearchText } from '../utils/formatters';

export const CHILEAN_SEED_PACK_ID = 'chilean-recipes-v1';
export const CHILEAN_SEED_PACK_V2_ID = 'chilean-recipes-v2';

export const DEFAULT_PROFILE: UserProfile = {
  id: 'default',
  pesoKg: 87,
  estaturaCm: 175,
  edad: 40,
  sexo: 'M',
  factorActividad: 1.55,
  deficitKcal: 400,
  proteinaGPorKg: 2.0,
  grasaGPorKg: 0.8,
  pesoMetaKg: 80,
  metaAguaMl: 2500,
  metaPasos: 8000,
  mostrarHabitosHoy: true,
  updatedAt: Date.now(),
};

export const SEED_COOK_METADATA: Record<
  string,
  { estadoBase: CookState; factorCoccion: number }
> = {
  'Pechuga de pollo cruda': { estadoBase: 'crudo', factorCoccion: 0.75 },
  'Posta rosada': { estadoBase: 'crudo', factorCoccion: 0.74 },
  'Carne molida magra (5%)': { estadoBase: 'crudo', factorCoccion: 0.75 },
  'Trutro de pollo sin piel': { estadoBase: 'crudo', factorCoccion: 0.76 },
  'Reineta / Merluza': { estadoBase: 'crudo', factorCoccion: 0.78 },
  'Salmón': { estadoBase: 'crudo', factorCoccion: 0.8 },
  'Avena': { estadoBase: 'crudo', factorCoccion: 2.5 },
  'Arroz cocido': { estadoBase: 'cocido', factorCoccion: 2.8 },
  'Arroz basmati cocido': { estadoBase: 'cocido', factorCoccion: 2.7 },
  'Fideos cocidos': { estadoBase: 'cocido', factorCoccion: 2.3 },
  'Papa cocida': { estadoBase: 'cocido', factorCoccion: 1.05 },
  'Lentejas cocidas': { estadoBase: 'cocido', factorCoccion: 2.5 },
  'Porotos cocidos': { estadoBase: 'cocido', factorCoccion: 2.4 },
  'Garbanzos cocidos': { estadoBase: 'cocido', factorCoccion: 2.2 },
};

export const SEED_FOODS: Omit<FoodItem, 'id'>[] = [
  {
    nombre: 'Pechuga de pollo cruda',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 120,
    proteinaG: 23,
    carbohidratosG: 0,
    grasasG: 2.6,
    esFavorito: true,
    ...SEED_COOK_METADATA['Pechuga de pollo cruda'],
  },
  {
    nombre: 'Huevo entero',
    categoria: 'proteina',
    unidadBase: 'unidad',
    porcionReferencia: 1,
    kcal: 72,
    proteinaG: 6.3,
    carbohidratosG: 0.4,
    grasasG: 4.8,
    esFavorito: true,
  },
  {
    nombre: 'Clara de huevo',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 52,
    proteinaG: 10.9,
    carbohidratosG: 0.7,
    grasasG: 0.2,
    esFavorito: true,
  },
  {
    nombre: 'Posta rosada',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 136,
    proteinaG: 21.5,
    carbohidratosG: 0,
    grasasG: 5.2,
    esFavorito: false,
    ...SEED_COOK_METADATA['Posta rosada'],
  },
  {
    nombre: 'Jurel en conserva',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 145,
    proteinaG: 21,
    carbohidratosG: 0,
    grasasG: 6.5,
    esFavorito: true,
  },
  {
    nombre: 'Atún al agua',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 116,
    proteinaG: 26,
    carbohidratosG: 0,
    grasasG: 0.8,
    esFavorito: true,
  },
  {
    nombre: 'Salmón',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 208,
    proteinaG: 20.4,
    carbohidratosG: 0,
    grasasG: 13.4,
    esFavorito: false,
    ...SEED_COOK_METADATA['Salmón'],
  },
  {
    nombre: 'Yogur griego alto en proteína',
    categoria: 'lacteo',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 59,
    proteinaG: 10,
    carbohidratosG: 3.6,
    grasasG: 0.4,
    esFavorito: true,
  },
  {
    nombre: 'Leche descremada',
    categoria: 'lacteo',
    unidadBase: 'ml',
    porcionReferencia: 100,
    kcal: 34,
    proteinaG: 3.4,
    carbohidratosG: 5,
    grasasG: 0.1,
    esFavorito: false,
  },
  {
    nombre: 'Queso fresco',
    categoria: 'lacteo',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 174,
    proteinaG: 14,
    carbohidratosG: 3,
    grasasG: 12,
    esFavorito: false,
  },
  {
    nombre: 'Avena',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 389,
    proteinaG: 16.9,
    carbohidratosG: 66.3,
    grasasG: 6.9,
    esFavorito: true,
    ...SEED_COOK_METADATA['Avena'],
  },
  {
    nombre: 'Arroz cocido',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 130,
    proteinaG: 2.7,
    carbohidratosG: 28.2,
    grasasG: 0.3,
    esFavorito: true,
    ...SEED_COOK_METADATA['Arroz cocido'],
  },
  {
    nombre: 'Arroz basmati cocido',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 121,
    proteinaG: 3.5,
    carbohidratosG: 25.2,
    grasasG: 0.4,
    esFavorito: false,
    ...SEED_COOK_METADATA['Arroz basmati cocido'],
  },
  {
    nombre: 'Papa cocida',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 87,
    proteinaG: 1.9,
    carbohidratosG: 20.1,
    grasasG: 0.1,
    esFavorito: false,
    ...SEED_COOK_METADATA['Papa cocida'],
  },
  {
    nombre: 'Pan pita integral',
    categoria: 'carbohidrato',
    unidadBase: 'unidad',
    porcionReferencia: 1,
    kcal: 155,
    proteinaG: 6,
    carbohidratosG: 31,
    grasasG: 1.2,
    esFavorito: true,
  },
  {
    nombre: 'Lentejas cocidas',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 116,
    proteinaG: 9,
    carbohidratosG: 20.1,
    grasasG: 0.4,
    esFavorito: false,
    ...SEED_COOK_METADATA['Lentejas cocidas'],
  },
  {
    nombre: 'Porotos cocidos',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 127,
    proteinaG: 8.7,
    carbohidratosG: 22.8,
    grasasG: 0.5,
    esFavorito: false,
    ...SEED_COOK_METADATA['Porotos cocidos'],
  },
  {
    nombre: 'Palta',
    categoria: 'grasa',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 160,
    proteinaG: 2,
    carbohidratosG: 8.5,
    grasasG: 14.7,
    esFavorito: true,
  },
  {
    nombre: 'Aceite de oliva',
    categoria: 'grasa',
    unidadBase: 'ml',
    porcionReferencia: 100,
    kcal: 884,
    proteinaG: 0,
    carbohidratosG: 0,
    grasasG: 100,
    esFavorito: false,
  },
  {
    nombre: 'Almendras / maní',
    categoria: 'grasa',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 579,
    proteinaG: 21.2,
    carbohidratosG: 21.6,
    grasasG: 49.9,
    esFavorito: false,
  },
  {
    nombre: 'Plátano',
    categoria: 'fruta_verdura',
    unidadBase: 'unidad',
    porcionReferencia: 1,
    kcal: 105,
    proteinaG: 1.3,
    carbohidratosG: 27,
    grasasG: 0.4,
    esFavorito: true,
  },
  {
    nombre: 'Manzana',
    categoria: 'fruta_verdura',
    unidadBase: 'unidad',
    porcionReferencia: 1,
    kcal: 95,
    proteinaG: 0.5,
    carbohidratosG: 25,
    grasasG: 0.3,
    esFavorito: false,
  },
  {
    nombre: 'Brócoli',
    categoria: 'fruta_verdura',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 34,
    proteinaG: 2.8,
    carbohidratosG: 6.6,
    grasasG: 0.4,
    esFavorito: false,
  },
  {
    nombre: 'Tomate',
    categoria: 'fruta_verdura',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 18,
    proteinaG: 0.9,
    carbohidratosG: 3.9,
    grasasG: 0.2,
    esFavorito: false,
  },
  {
    nombre: 'Proteína whey',
    categoria: 'proteina',
    unidadBase: 'unidad',
    porcionReferencia: 1,
    kcal: 120,
    proteinaG: 24,
    carbohidratosG: 3,
    grasasG: 1.5,
    esFavorito: true,
  },
  // --- Ingredientes esenciales de cocina chilena ---
  {
    nombre: 'Carne molida magra (5%)',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 137,
    proteinaG: 21.4,
    carbohidratosG: 0,
    grasasG: 5,
    esFavorito: false,
    ...SEED_COOK_METADATA['Carne molida magra (5%)'],
  },
  {
    nombre: 'Trutro de pollo sin piel',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 145,
    proteinaG: 19.5,
    carbohidratosG: 0,
    grasasG: 7.2,
    esFavorito: false,
    ...SEED_COOK_METADATA['Trutro de pollo sin piel'],
  },
  {
    nombre: 'Reineta / Merluza',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 96,
    proteinaG: 20,
    carbohidratosG: 0,
    grasasG: 1.5,
    esFavorito: false,
    ...SEED_COOK_METADATA['Reineta / Merluza'],
  },
  {
    nombre: 'Jamón de pavo',
    categoria: 'proteina',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 105,
    proteinaG: 20,
    carbohidratosG: 2,
    grasasG: 1.5,
    esFavorito: false,
  },
  {
    nombre: 'Quesillo',
    categoria: 'lacteo',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 98,
    proteinaG: 12.5,
    carbohidratosG: 3.5,
    grasasG: 3.5,
    esFavorito: false,
  },
  {
    nombre: 'Pan marraqueta',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 268,
    proteinaG: 8.5,
    carbohidratosG: 55,
    grasasG: 1.5,
    esFavorito: false,
  },
  {
    nombre: 'Fideos cocidos',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 131,
    proteinaG: 5,
    carbohidratosG: 25,
    grasasG: 1.1,
    esFavorito: false,
    ...SEED_COOK_METADATA['Fideos cocidos'],
  },
  {
    nombre: 'Choclo',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 96,
    proteinaG: 3.4,
    carbohidratosG: 21,
    grasasG: 1.5,
    esFavorito: false,
  },
  {
    nombre: 'Garbanzos cocidos',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 164,
    proteinaG: 8.9,
    carbohidratosG: 27.4,
    grasasG: 2.6,
    esFavorito: false,
    ...SEED_COOK_METADATA['Garbanzos cocidos'],
  },
  {
    nombre: 'Zapallo camote',
    categoria: 'fruta_verdura',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 34,
    proteinaG: 1,
    carbohidratosG: 8,
    grasasG: 0.1,
    esFavorito: false,
  },
  {
    nombre: 'Porotos verdes',
    categoria: 'fruta_verdura',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 31,
    proteinaG: 1.8,
    carbohidratosG: 7,
    grasasG: 0.2,
    esFavorito: false,
  },
  {
    nombre: 'Cebolla',
    categoria: 'fruta_verdura',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 40,
    proteinaG: 1.1,
    carbohidratosG: 9.3,
    grasasG: 0.1,
    esFavorito: false,
  },
  {
    nombre: 'Zapallo italiano',
    categoria: 'fruta_verdura',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 17,
    proteinaG: 1.2,
    carbohidratosG: 3.1,
    grasasG: 0.3,
    esFavorito: false,
  },
  {
    nombre: 'Arvejas cocidas',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 84,
    proteinaG: 5.4,
    carbohidratosG: 15.6,
    grasasG: 0.2,
    esFavorito: false,
  },
  {
    nombre: 'Zanahoria',
    categoria: 'fruta_verdura',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 41,
    proteinaG: 0.9,
    carbohidratosG: 9.6,
    grasasG: 0.2,
    esFavorito: false,
  },
  {
    nombre: 'Harina de trigo',
    categoria: 'carbohidrato',
    unidadBase: 'g',
    porcionReferencia: 100,
    kcal: 364,
    proteinaG: 10.3,
    carbohidratosG: 76.3,
    grasasG: 1,
    esFavorito: false,
  },
];

function buildCombo(
  nombre: string,
  slotSugerido: MealCombo['slotSugerido'],
  items: { food: FoodItem; cantidad: number }[],
  etiqueta?: string,
): Omit<MealCombo, 'id'> {
  const ingredientes: ComboIngredient[] = items.map(({ food, cantidad }) => {
    const factor = cantidad / food.porcionReferencia;
    return {
      foodId: food.id,
      nombre: food.nombre,
      cantidad,
      unidad: food.unidadBase,
      kcal: Math.round(food.kcal * factor),
      proteinaG: Number((food.proteinaG * factor).toFixed(1)),
      carbohidratosG: Number((food.carbohidratosG * factor).toFixed(1)),
      grasasG: Number((food.grasasG * factor).toFixed(1)),
    };
  });

  const totalKcal = Math.round(ingredientes.reduce((sum, i) => sum + i.kcal, 0));
  const totalProteinaG = Number(
    ingredientes.reduce((sum, i) => sum + i.proteinaG, 0).toFixed(1),
  );
  const totalCarbsG = Number(
    ingredientes.reduce((sum, i) => sum + i.carbohidratosG, 0).toFixed(1),
  );
  const totalGrasasG = Number(
    ingredientes.reduce((sum, i) => sum + i.grasasG, 0).toFixed(1),
  );

  return {
    nombre,
    slotSugerido,
    ...(etiqueta ? { etiqueta } : {}),
    ingredientes,
    totalKcal,
    totalProteinaG,
    totalCarbsG,
    totalGrasasG,
  };
}

interface RecipeBlueprint {
  nombre: string;
  slotSugerido: MealCombo['slotSugerido'];
  etiqueta?: string;
  items: { foodName: string; cantidad: number }[];
}

const CHILEAN_RECIPES: RecipeBlueprint[] = [
  {
    nombre: 'Cazuela de vacuno',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Posta rosada', cantidad: 180 },
      { foodName: 'Papa cocida', cantidad: 150 },
      { foodName: 'Zapallo camote', cantidad: 100 },
      { foodName: 'Choclo', cantidad: 80 },
      { foodName: 'Porotos verdes', cantidad: 60 },
      { foodName: 'Arroz cocido', cantidad: 50 },
    ],
  },
  {
    nombre: 'Cazuela de ave',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Trutro de pollo sin piel', cantidad: 180 },
      { foodName: 'Papa cocida', cantidad: 150 },
      { foodName: 'Zapallo camote', cantidad: 100 },
      { foodName: 'Choclo', cantidad: 70 },
      { foodName: 'Porotos verdes', cantidad: 60 },
      { foodName: 'Arroz cocido', cantidad: 50 },
    ],
  },
  {
    nombre: 'Charquicán con huevo',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Carne molida magra (5%)', cantidad: 150 },
      { foodName: 'Papa cocida', cantidad: 180 },
      { foodName: 'Zapallo camote', cantidad: 120 },
      { foodName: 'Choclo', cantidad: 50 },
      { foodName: 'Cebolla', cantidad: 50 },
      { foodName: 'Huevo entero', cantidad: 1 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Pastel de choclo casero',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Carne molida magra (5%)', cantidad: 140 },
      { foodName: 'Pechuga de pollo cruda', cantidad: 60 },
      { foodName: 'Choclo', cantidad: 180 },
      { foodName: 'Cebolla', cantidad: 70 },
      { foodName: 'Huevo entero', cantidad: 0.5 },
      { foodName: 'Leche descremada', cantidad: 50 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Carbonada chilena',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Posta rosada', cantidad: 160 },
      { foodName: 'Papa cocida', cantidad: 140 },
      { foodName: 'Zapallo camote', cantidad: 90 },
      { foodName: 'Porotos verdes', cantidad: 60 },
      { foodName: 'Choclo', cantidad: 50 },
      { foodName: 'Cebolla', cantidad: 40 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Porotos con riendas',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Porotos cocidos', cantidad: 220 },
      { foodName: 'Fideos cocidos', cantidad: 80 },
      { foodName: 'Zapallo camote', cantidad: 100 },
      { foodName: 'Cebolla', cantidad: 50 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Lentejas guisadas con arroz',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Lentejas cocidas', cantidad: 240 },
      { foodName: 'Arroz cocido', cantidad: 100 },
      { foodName: 'Cebolla', cantidad: 50 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Reineta a la plancha + ensalada chilena',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Reineta / Merluza', cantidad: 200 },
      { foodName: 'Papa cocida', cantidad: 200 },
      { foodName: 'Tomate', cantidad: 150 },
      { foodName: 'Cebolla', cantidad: 50 },
      { foodName: 'Aceite de oliva', cantidad: 8 },
    ],
  },
  {
    nombre: 'Tomaticán con carne y choclo',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Posta rosada', cantidad: 160 },
      { foodName: 'Tomate', cantidad: 200 },
      { foodName: 'Choclo', cantidad: 120 },
      { foodName: 'Cebolla', cantidad: 70 },
      { foodName: 'Papa cocida', cantidad: 120 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Bistec a lo pobre versión fit',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Posta rosada', cantidad: 180 },
      { foodName: 'Papa cocida', cantidad: 200 },
      { foodName: 'Cebolla', cantidad: 100 },
      { foodName: 'Huevo entero', cantidad: 1 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Chacarero de posta rosada',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Posta rosada', cantidad: 160 },
      { foodName: 'Pan marraqueta', cantidad: 90 },
      { foodName: 'Porotos verdes', cantidad: 80 },
      { foodName: 'Tomate', cantidad: 80 },
      { foodName: 'Palta', cantidad: 40 },
    ],
  },
  {
    nombre: 'Zapallo italiano relleno',
    slotSugerido: 'once_cena',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Zapallo italiano', cantidad: 250 },
      { foodName: 'Carne molida magra (5%)', cantidad: 160 },
      { foodName: 'Cebolla', cantidad: 60 },
      { foodName: 'Quesillo', cantidad: 50 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Ensalada de jurel a la chilena',
    slotSugerido: 'once_cena',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Jurel en conserva', cantidad: 140 },
      { foodName: 'Papa cocida', cantidad: 150 },
      { foodName: 'Tomate', cantidad: 120 },
      { foodName: 'Cebolla', cantidad: 50 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Once chilena: marraqueta pavo + quesillo + palta',
    slotSugerido: 'once_cena',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Pan marraqueta', cantidad: 80 },
      { foodName: 'Jamón de pavo', cantidad: 80 },
      { foodName: 'Quesillo', cantidad: 70 },
      { foodName: 'Palta', cantidad: 45 },
      { foodName: 'Tomate', cantidad: 60 },
    ],
  },
  {
    nombre: 'Once chilena: marraqueta palta + huevo',
    slotSugerido: 'once_cena',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Pan marraqueta', cantidad: 80 },
      { foodName: 'Palta', cantidad: 60 },
      { foodName: 'Huevo entero', cantidad: 2 },
      { foodName: 'Tomate', cantidad: 80 },
    ],
  },
  {
    nombre: 'Desayuno chileno: marraqueta huevo + palta',
    slotSugerido: 'desayuno',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Pan marraqueta', cantidad: 70 },
      { foodName: 'Huevo entero', cantidad: 2 },
      { foodName: 'Clara de huevo', cantidad: 80 },
      { foodName: 'Palta', cantidad: 50 },
    ],
  },
];

const CHILEAN_RECIPES_V2: RecipeBlueprint[] = [
  {
    nombre: 'Humitas con ensalada chilena',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Choclo', cantidad: 280 },
      { foodName: 'Cebolla', cantidad: 60 },
      { foodName: 'Leche descremada', cantidad: 60 },
      { foodName: 'Aceite de oliva', cantidad: 8 },
      { foodName: 'Tomate', cantidad: 150 },
    ],
  },
  {
    nombre: 'Porotos granados con mazamorra',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Porotos cocidos', cantidad: 220 },
      { foodName: 'Choclo', cantidad: 140 },
      { foodName: 'Zapallo camote', cantidad: 120 },
      { foodName: 'Cebolla', cantidad: 50 },
      { foodName: 'Tomate', cantidad: 80 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Empanada de pino al horno',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Harina de trigo', cantidad: 75 },
      { foodName: 'Posta rosada', cantidad: 90 },
      { foodName: 'Cebolla', cantidad: 70 },
      { foodName: 'Huevo entero', cantidad: 0.5 },
      { foodName: 'Aceite de oliva', cantidad: 10 },
    ],
  },
  {
    nombre: 'Pollo arvejado con arroz',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Trutro de pollo sin piel', cantidad: 180 },
      { foodName: 'Arroz cocido', cantidad: 140 },
      { foodName: 'Arvejas cocidas', cantidad: 70 },
      { foodName: 'Zanahoria', cantidad: 60 },
      { foodName: 'Cebolla', cantidad: 50 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
  {
    nombre: 'Pastel de papa casero',
    slotSugerido: 'almuerzo',
    etiqueta: 'chilena',
    items: [
      { foodName: 'Carne molida magra (5%)', cantidad: 160 },
      { foodName: 'Papa cocida', cantidad: 240 },
      { foodName: 'Cebolla', cantidad: 70 },
      { foodName: 'Huevo entero', cantidad: 0.5 },
      { foodName: 'Leche descremada', cantidad: 60 },
      { foodName: 'Aceite de oliva', cantidad: 5 },
    ],
  },
];

function buildDayTemplateFromCombos(
  nombre: string,
  descripcion: string,
  combos: Omit<MealCombo, 'id'>[],
): Omit<DayMenuTemplate, 'id'> {
  const entries: DayTemplateEntry[] = combos.map((c) => ({
    slot: c.slotSugerido,
    nombre: c.nombre,
    cantidadTexto: `Menú (${c.ingredientes.length} ing.)`,
    kcal: c.totalKcal,
    proteinaG: c.totalProteinaG,
    carbohidratosG: c.totalCarbsG,
    grasasG: c.totalGrasasG,
    ingredientes: c.ingredientes,
  }));

  const totalKcal = Math.round(entries.reduce((s, e) => s + e.kcal, 0));
  const totalProteinaG = Number(
    entries.reduce((s, e) => s + e.proteinaG, 0).toFixed(1),
  );
  const totalCarbsG = Number(
    entries.reduce((s, e) => s + e.carbohidratosG, 0).toFixed(1),
  );
  const totalGrasasG = Number(
    entries.reduce((s, e) => s + e.grasasG, 0).toFixed(1),
  );

  return {
    nombre,
    descripcion,
    entries,
    totalKcal,
    totalProteinaG,
    totalCarbsG,
    totalGrasasG,
    createdAt: Date.now(),
  };
}

let seedInFlight: Promise<void> | null = null;

export function ensureSeedData(): Promise<void> {
  if (!seedInFlight) {
    seedInFlight = (async () => {
      await db.transaction(
        'rw',
        [db.profile, db.foods, db.combos, db.dayTemplates],
        async () => {
          const existingProfile = await db.profile.get('default');
          let activeProfile: UserProfile;
          if (!existingProfile) {
            activeProfile = { ...DEFAULT_PROFILE, updatedAt: Date.now() };
            await db.profile.put(activeProfile);
          } else {
            activeProfile = existingProfile;
            if (existingProfile.mostrarHabitosHoy === undefined) {
              activeProfile = {
                ...existingProfile,
                metaAguaMl: existingProfile.metaAguaMl ?? DEFAULT_PROFILE.metaAguaMl,
                metaPasos: existingProfile.metaPasos ?? DEFAULT_PROFILE.metaPasos,
                mostrarHabitosHoy: true,
              };
              await db.profile.put(activeProfile);
            }
          }

          let foodsCount = await db.foods.count();
          if (foodsCount === 0) {
            await db.foods.bulkAdd(SEED_FOODS);
            foodsCount = await db.foods.count();
          } else {
            const allExistingFoods = await db.foods.toArray();
            for (const f of allExistingFoods) {
              const meta = SEED_COOK_METADATA[f.nombre];
              if (meta && f.id !== undefined && f.factorCoccion === undefined) {
                await db.foods.update(f.id, {
                  estadoBase: meta.estadoBase,
                  factorCoccion: meta.factorCoccion,
                });
              }
            }
          }

          const combosCount = await db.combos.count();
          if (combosCount === 0 && foodsCount > 0) {
            const allFoods = await db.foods.toArray();
            const byName = new Map(allFoods.map((f) => [f.nombre, f]));
            const getFood = (name: string) => byName.get(name);

            const huevo = getFood('Huevo entero');
            const clara = getFood('Clara de huevo');
            const avena = getFood('Avena');
            const pollo = getFood('Pechuga de pollo cruda');
            const arroz = getFood('Arroz cocido');
            const aceite = getFood('Aceite de oliva');
            const whey = getFood('Proteína whey');
            const platano = getFood('Plátano');
            const leche = getFood('Leche descremada');
            const jurel = getFood('Jurel en conserva');
            const palta = getFood('Palta');
            const pita = getFood('Pan pita integral');

            const combosToAdd: Omit<MealCombo, 'id'>[] = [];

            if (huevo && clara && avena) {
              combosToAdd.push(
                buildCombo('Desayuno 3 huevos + avena', 'desayuno', [
                  { food: huevo, cantidad: 3 },
                  { food: clara, cantidad: 50 },
                  { food: avena, cantidad: 65 },
                ]),
              );
            }

            if (pollo && arroz && aceite) {
              combosToAdd.push(
                buildCombo('Pollo + arroz base', 'almuerzo', [
                  { food: pollo, cantidad: 220 },
                  { food: arroz, cantidad: 220 },
                  { food: aceite, cantidad: 5 },
                ]),
              );
            }

            if (whey && platano && leche) {
              combosToAdd.push(
                buildCombo('Batido whey + plátano', 'snack', [
                  { food: whey, cantidad: 1 },
                  { food: platano, cantidad: 1 },
                  { food: leche, cantidad: 200 },
                ]),
              );
            }

            if (jurel && palta && pita) {
              combosToAdd.push(
                buildCombo('Jurel + palta + pan pita', 'once_cena', [
                  { food: jurel, cantidad: 120 },
                  { food: palta, cantidad: 80 },
                  { food: pita, cantidad: 1 },
                ]),
              );
            }

            if (combosToAdd.length > 0) {
              await db.combos.bulkAdd(combosToAdd);
            }
          }

          const templatesCount = await db.dayTemplates.count();
          if (templatesCount === 0) {
            const allCombos = await db.combos.toArray();
            if (allCombos.length >= 4) {
              const starterTemplate = buildDayTemplateFromCombos(
                'Día base definición',
                'Los 4 menús base equilibrados en proteína',
                allCombos.slice(0, 4),
              );
              await db.dayTemplates.add(starterTemplate);
            }
          }

          // --- Packs idempotentes de recetas de comida chilena (instalaciones nuevas y existentes) ---
          const appliedPacks = new Set(activeProfile.seedPacksApplied ?? []);
          const pendingPacks: {
            id: string;
            recipes: RecipeBlueprint[];
            addDayTemplate?: boolean;
          }[] = [];

          if (!appliedPacks.has(CHILEAN_SEED_PACK_ID)) {
            pendingPacks.push({
              id: CHILEAN_SEED_PACK_ID,
              recipes: CHILEAN_RECIPES,
              addDayTemplate: true,
            });
          }
          if (!appliedPacks.has(CHILEAN_SEED_PACK_V2_ID)) {
            pendingPacks.push({
              id: CHILEAN_SEED_PACK_V2_ID,
              recipes: CHILEAN_RECIPES_V2,
            });
          }

          if (pendingPacks.length > 0) {
            const currentFoods = await db.foods.toArray();
            const existingFoodNames = new Set(
              currentFoods.map((f) => normalizeSearchText(f.nombre)),
            );

            const missingFoods = SEED_FOODS.filter(
              (sf) => !existingFoodNames.has(normalizeSearchText(sf.nombre)),
            );
            if (missingFoods.length > 0) {
              await db.foods.bulkAdd(missingFoods);
            }

            const refreshedFoods = await db.foods.toArray();
            const foodByNormName = new Map(
              refreshedFoods.map((f) => [normalizeSearchText(f.nombre), f]),
            );
            const getFoodByName = (name: string) =>
              foodByNormName.get(normalizeSearchText(name));

            const existingCombos = await db.combos.toArray();
            const existingComboNames = new Set(
              existingCombos.map((c) => normalizeSearchText(c.nombre)),
            );

            const chileanCombosToAdd: Omit<MealCombo, 'id'>[] = [];
            for (const pack of pendingPacks) {
              for (const recipe of pack.recipes) {
                const normName = normalizeSearchText(recipe.nombre);
                if (existingComboNames.has(normName)) {
                  continue;
                }
                const resolvedItems: { food: FoodItem; cantidad: number }[] = [];
                let allFound = true;
                for (const item of recipe.items) {
                  const food = getFoodByName(item.foodName);
                  if (!food) {
                    allFound = false;
                    break;
                  }
                  resolvedItems.push({ food, cantidad: item.cantidad });
                }
                if (allFound && resolvedItems.length > 0) {
                  existingComboNames.add(normName);
                  chileanCombosToAdd.push(
                    buildCombo(
                      recipe.nombre,
                      recipe.slotSugerido,
                      resolvedItems,
                      recipe.etiqueta,
                    ),
                  );
                }
              }
            }

            if (chileanCombosToAdd.length > 0) {
              await db.combos.bulkAdd(chileanCombosToAdd);
            }

            if (pendingPacks.some((p) => p.addDayTemplate)) {
              const existingTemplates = await db.dayTemplates.toArray();
              const existingTemplateNames = new Set(
                existingTemplates.map((t) => normalizeSearchText(t.nombre)),
              );
              const chileanDayName = 'Día chileno equilibrado';
              if (!existingTemplateNames.has(normalizeSearchText(chileanDayName))) {
                const allCombosNow = await db.combos.toArray();
                const comboByNormName = new Map(
                  allCombosNow.map((c) => [normalizeSearchText(c.nombre), c]),
                );
                const dayComboNames = [
                  'Desayuno chileno: marraqueta huevo + palta',
                  'Cazuela de vacuno',
                  'Batido whey + plátano',
                  'Once chilena: marraqueta pavo + quesillo + palta',
                ];
                const picked = dayComboNames
                  .map((n) => comboByNormName.get(normalizeSearchText(n)))
                  .filter((c): c is MealCombo => Boolean(c));

                if (picked.length >= 3) {
                  await db.dayTemplates.add(
                    buildDayTemplateFromCombos(
                      chileanDayName,
                      'Desayuno chileno, cazuela de vacuno, snack proteico y once con marraqueta',
                      picked,
                    ),
                  );
                }
              }
            }

            for (const pack of pendingPacks) {
              appliedPacks.add(pack.id);
            }
            await db.profile.update('default', {
              seedPacksApplied: Array.from(appliedPacks),
            });
          }
        },
      );
    })().catch((err) => {
      seedInFlight = null;
      throw err;
    });
  }
  return seedInFlight;
}
