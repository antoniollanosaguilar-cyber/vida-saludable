import type { CookState, DailyTargets, FoodItem, UserProfile } from '../types/models';

export function calculateDailyTargets(profile: UserProfile): DailyTargets {
  const pesoKg = Math.max(30, Number(profile.pesoKg) || 87);
  const estaturaCm = Math.max(120, Number(profile.estaturaCm) || 175);
  const edad = Math.max(14, Number(profile.edad) || 40);
  const factorActividad = Number(profile.factorActividad) || 1.55;
  const deficitKcal = Math.max(0, Number(profile.deficitKcal) || 0);
  const proteinaGPorKg = Math.max(1.0, Number(profile.proteinaGPorKg) || 2.0);
  const grasaGPorKg = Math.max(0.5, Number(profile.grasaGPorKg) || 0.8);

  const rawTmb =
    profile.sexo === 'M'
      ? 10 * pesoKg + 6.25 * estaturaCm - 5 * edad + 5
      : 10 * pesoKg + 6.25 * estaturaCm - 5 * edad - 161;

  const tmbKcal = Math.round(rawTmb);
  const tdeeKcal = Math.round(rawTmb * factorActividad);
  const pisoSeguroKcal = Math.max(1200, tmbKcal);

  const rawObjetivo = tdeeKcal - deficitKcal;
  const alcanzoPisoSeguro = rawObjetivo <= pisoSeguroKcal;
  const caloriasObjetivo = Math.max(pisoSeguroKcal, rawObjetivo);

  const proteinaG = Math.round(pesoKg * proteinaGPorKg);
  const grasasG = Math.round(pesoKg * grasaGPorKg);
  const carbohidratosG = Math.round(
    Math.max(0, (caloriasObjetivo - proteinaG * 4 - grasasG * 9) / 4),
  );

  const perdidaSemanalEstimadaKg = Number(
    (((tdeeKcal - caloriasObjetivo) * 7) / 7700).toFixed(2),
  );

  return {
    tmbKcal,
    tdeeKcal,
    pisoSeguroKcal,
    caloriasObjetivo,
    proteinaG,
    grasasG,
    carbohidratosG,
    perdidaSemanalEstimadaKg,
    alcanzoPisoSeguro,
  };
}

export interface CalculatedMacros {
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
  equivalentBaseAmount: number;
}

/**
 * Convierte la cantidad ingresada (en crudo o cocido) a la cantidad equivalente
 * en el estado base del alimento.
 *
 * factorCoccion = peso_cocido / peso_crudo
 * - Carnes/pollo: ~0.75 (100g crudo -> 75g cocido)
 * - Arroz/avena/legumbres: ~2.5 - 2.8 (100g crudo -> 280g cocido)
 */
export function resolveCookEquivalentAmount(
  amount: number,
  estadoBase?: CookState,
  factorCoccion?: number,
  selectedCookState?: CookState,
): number {
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
  if (
    !estadoBase ||
    !factorCoccion ||
    factorCoccion <= 0 ||
    !selectedCookState ||
    selectedCookState === estadoBase
  ) {
    return safeAmount;
  }

  if (estadoBase === 'crudo' && selectedCookState === 'cocido') {
    return safeAmount / factorCoccion;
  }

  if (estadoBase === 'cocido' && selectedCookState === 'crudo') {
    return safeAmount * factorCoccion;
  }

  return safeAmount;
}

export function calculatePortionMacros(
  food: Pick<
    FoodItem,
    | 'porcionReferencia'
    | 'kcal'
    | 'proteinaG'
    | 'carbohidratosG'
    | 'grasasG'
    | 'estadoBase'
    | 'factorCoccion'
  >,
  amount: number,
  selectedCookState?: CookState,
): CalculatedMacros {
  const safeRef = food.porcionReferencia > 0 ? food.porcionReferencia : 100;
  const equivalentBaseAmount = resolveCookEquivalentAmount(
    amount,
    food.estadoBase,
    food.factorCoccion,
    selectedCookState,
  );
  const factor = equivalentBaseAmount / safeRef;

  return {
    kcal: Math.round(food.kcal * factor),
    proteinaG: Number((food.proteinaG * factor).toFixed(1)),
    carbohidratosG: Number((food.carbohidratosG * factor).toFixed(1)),
    grasasG: Number((food.grasasG * factor).toFixed(1)),
    equivalentBaseAmount: Number(equivalentBaseAmount.toFixed(1)),
  };
}
