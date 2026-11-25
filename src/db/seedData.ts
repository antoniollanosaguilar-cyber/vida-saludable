import { db } from './database';
import type {
  ComboIngredient,
  CookState,
  FoodItem,
  MealCombo,
  UserProfile,
} from '../types/models';

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
  'Salmón': { estadoBase: 'crudo', factorCoccion: 0.8 },
  'Avena': { estadoBase: 'crudo', factorCoccion: 2.5 },
  'Arroz cocido': { estadoBase: 'cocido', factorCoccion: 2.8 },
  'Arroz basmati cocido': { estadoBase: 'cocido', factorCoccion: 2.7 },
  'Papa cocida': { estadoBase: 'cocido', factorCoccion: 1.05 },
  'Lentejas cocidas': { estadoBase: 'cocido', factorCoccion: 2.5 },
  'Porotos cocidos': { estadoBase: 'cocido', factorCoccion: 2.4 },
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
];

function buildCombo(
  nombre: string,
  slotSugerido: MealCombo['slotSugerido'],
  items: { food: FoodItem; cantidad: number }[],
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
    ingredientes,
    totalKcal,
    totalProteinaG,
    totalCarbsG,
    totalGrasasG,
  };
}

let seedInFlight: Promise<void> | null = null;

export function ensureSeedData(): Promise<void> {
  if (!seedInFlight) {
    seedInFlight = (async () => {
      await db.transaction(
        'rw',
        db.profile,
        db.foods,
        db.combos,
        async () => {
          const existingProfile = await db.profile.get('default');
          if (!existingProfile) {
            await db.profile.put({ ...DEFAULT_PROFILE, updatedAt: Date.now() });
          } else if (existingProfile.mostrarHabitosHoy === undefined) {
            await db.profile.put({
              ...existingProfile,
              metaAguaMl: existingProfile.metaAguaMl ?? DEFAULT_PROFILE.metaAguaMl,
              metaPasos: existingProfile.metaPasos ?? DEFAULT_PROFILE.metaPasos,
              mostrarHabitosHoy: true,
            });
          }

          let foodsCount = await db.foods.count();
          if (foodsCount === 0) {
            await db.foods.bulkAdd(SEED_FOODS);
            foodsCount = await db.foods.count();
          } else {
            // Backfill crudo/cocido metadata en alimentos existentes sin pisar ediciones del usuario
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
        },
      );
    })().catch((err) => {
      seedInFlight = null;
      throw err;
    });
  }
  return seedInFlight;
}
