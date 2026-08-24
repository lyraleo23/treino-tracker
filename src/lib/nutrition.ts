import type { Food } from '../db/db'

export interface ComputedNutrition {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  /** false quando o alimento não tinha nutrição conhecida ou a unidade não batia com o base_unit dele. */
  known: boolean
}

const ZERO: ComputedNutrition = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, known: false }

/**
 * Nutrição de um item lançado. Uma única regra cobre os três casos especiais
 * da dieta de origem — alimento sem nutrição definida, azeite lançado em
 * "fio" e iogurte em "porção" — sem inventar fator de conversão: só conta
 * quando o alimento tem nutrição conhecida *e* a unidade lançada bate com o
 * base_unit dele.
 */
export function computeItemNutrition(
  food: Food | undefined,
  quantity: number,
  unit: string,
): ComputedNutrition {
  if (
    !food ||
    food.caloriesPerBaseUnit === null ||
    food.proteinPerBaseUnit === null ||
    food.carbsPerBaseUnit === null ||
    food.fatPerBaseUnit === null ||
    unit !== food.baseUnit
  ) {
    return ZERO
  }

  return {
    calories: food.caloriesPerBaseUnit * quantity,
    proteinG: food.proteinPerBaseUnit * quantity,
    carbsG: food.carbsPerBaseUnit * quantity,
    fatG: food.fatPerBaseUnit * quantity,
    known: true,
  }
}

export function sumNutrition(items: ComputedNutrition[]): ComputedNutrition {
  return items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      proteinG: sum.proteinG + item.proteinG,
      carbsG: sum.carbsG + item.carbsG,
      fatG: sum.fatG + item.fatG,
      known: sum.known && item.known,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, known: true },
  )
}
