import { db, type DietIngredient, type DietMeal, type DietOption, type DietSelectionMode, type Food } from './db'

/**
 * Transcrito de `HIPERTRON - DIETA 2200-2400 KCAL`, fornecida pelo usuário já
 * calculada (alimentos prontos/preparados). Nutrição por unidade-base; `null`
 * quando a fonte não define (fruta variável do dia).
 */
interface FoodSeed {
  id: string
  name: string
  baseUnit: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  estimated: boolean
}

const SEED_FOODS: FoodSeed[] = [
  { id: 'egg_whole', name: 'Ovo inteiro', baseUnit: 'un', calories: 62.5, protein: 5.2, carbs: 0.69, fat: 4.35, estimated: true },
  { id: 'egg_white', name: 'Clara de ovo', baseUnit: 'un', calories: 17.0, protein: 3.6, carbs: 0.24, fat: 0.06, estimated: true },
  { id: 'whey_protein', name: 'Whey protein', baseUnit: 'g', calories: 3.9, protein: 0.667, carbs: 0.1, fat: 0.07, estimated: true },
  { id: 'skim_milk', name: 'Leite desnatado', baseUnit: 'ml', calories: 0.35, protein: 0.034, carbs: 0.05, fat: 0.001, estimated: true },
  { id: 'light_greek_yogurt', name: 'Iogurte grego light', baseUnit: 'ml', calories: 0.55, protein: 0.055, carbs: 0.06, fat: 0.01, estimated: true },
  { id: 'chicken_shredded', name: 'Frango desfiado', baseUnit: 'g', calories: 1.81, protein: 0.259, carbs: 0.0, fat: 0.085, estimated: true },
  { id: 'chicken_breast_grilled', name: 'Filé de frango grelhado', baseUnit: 'g', calories: 1.65, protein: 0.31, carbs: 0.0, fat: 0.036, estimated: true },
  { id: 'chicken_thigh_roasted_skinless_boneless', name: 'Sobrecoxa assada sem pele e sem osso', baseUnit: 'g', calories: 2.05, protein: 0.26, carbs: 0.0, fat: 0.105, estimated: true },
  { id: 'tuna_water_or_fresh', name: 'Atum em água ou fresco', baseUnit: 'g', calories: 1.16, protein: 0.26, carbs: 0.0, fat: 0.009, estimated: true },
  { id: 'tilapia_grilled', name: 'Tilápia grelhada', baseUnit: 'g', calories: 1.28, protein: 0.265, carbs: 0.0, fat: 0.028, estimated: true },
  { id: 'ground_beef_patinho', name: 'Patinho', baseUnit: 'g', calories: 2.0, protein: 0.3, carbs: 0.0, fat: 0.085, estimated: true },
  { id: 'pork_loin_cooked', name: 'Lombo suíno cozido', baseUnit: 'g', calories: 2.05, protein: 0.295, carbs: 0.0, fat: 0.085, estimated: true },
  { id: 'salmon_grilled', name: 'Salmão grelhado', baseUnit: 'g', calories: 2.06, protein: 0.25, carbs: 0.0, fat: 0.12, estimated: true },
  { id: 'salmon_raw', name: 'Salmão cru', baseUnit: 'g', calories: 2.08, protein: 0.2, carbs: 0.0, fat: 0.13, estimated: true },
  { id: 'tapioca', name: 'Tapioca', baseUnit: 'g', calories: 3.5, protein: 0.001, carbs: 0.86, fat: 0.001, estimated: true },
  { id: 'french_bread', name: 'Pão francês', baseUnit: 'un', calories: 135.0, protein: 4.2, carbs: 28.0, fat: 1.2, estimated: true },
  { id: 'wholegrain_bread', name: 'Pão integral', baseUnit: 'fatia', calories: 65.0, protein: 2.8, carbs: 11.5, fat: 1.1, estimated: true },
  { id: 'rice_cooked', name: 'Arroz cozido', baseUnit: 'g', calories: 1.28, protein: 0.025, carbs: 0.28, fat: 0.002, estimated: true },
  { id: 'beans_cooked', name: 'Feijão cozido', baseUnit: 'g', calories: 1.33, protein: 0.096, carbs: 0.263, fat: 0.008, estimated: true },
  { id: 'mashed_potato', name: 'Purê de batata', baseUnit: 'g', calories: 1.1, protein: 0.02, carbs: 0.17, fat: 0.035, estimated: true },
  { id: 'cassava_cooked', name: 'Mandioca cozida', baseUnit: 'g', calories: 1.25, protein: 0.012, carbs: 0.3, fat: 0.003, estimated: true },
  { id: 'pasta_cooked', name: 'Macarrão cozido', baseUnit: 'g', calories: 1.58, protein: 0.058, carbs: 0.31, fat: 0.009, estimated: true },
  { id: 'mandioquinha_cooked', name: 'Mandioquinha cozida', baseUnit: 'g', calories: 0.8, protein: 0.01, carbs: 0.19, fat: 0.002, estimated: true },
  { id: 'oats', name: 'Aveia', baseUnit: 'g', calories: 3.89, protein: 0.169, carbs: 0.663, fat: 0.069, estimated: true },
  { id: 'granola', name: 'Granola', baseUnit: 'g', calories: 4.3, protein: 0.1, carbs: 0.68, fat: 0.14, estimated: true },
  { id: 'peanut_butter', name: 'Pasta de amendoim', baseUnit: 'g', calories: 5.9, protein: 0.25, carbs: 0.2, fat: 0.5, estimated: true },
  { id: 'kiwi', name: 'Kiwi', baseUnit: 'un', calories: 42.0, protein: 0.8, carbs: 10.0, fat: 0.4, estimated: true },
  { id: 'papaya', name: 'Mamão papaia', baseUnit: 'un', calories: 240.0, protein: 3.0, carbs: 60.0, fat: 1.0, estimated: true },
  { id: 'banana_prata', name: 'Banana prata', baseUnit: 'un', calories: 75.0, protein: 0.9, carbs: 19.0, fat: 0.2, estimated: true },
  { id: 'banana_large', name: 'Banana grande', baseUnit: 'un', calories: 120.0, protein: 1.5, carbs: 31.0, fat: 0.4, estimated: true },
  { id: 'grapes', name: 'Uva', baseUnit: 'g', calories: 0.69, protein: 0.007, carbs: 0.18, fat: 0.002, estimated: true },
  { id: 'strawberries', name: 'Morangos', baseUnit: 'g', calories: 0.32, protein: 0.007, carbs: 0.077, fat: 0.003, estimated: true },
  { id: 'apple', name: 'Maçã', baseUnit: 'un', calories: 95.0, protein: 0.5, carbs: 25.0, fat: 0.3, estimated: true },
  { id: 'melon', name: 'Melão', baseUnit: 'g', calories: 0.34, protein: 0.008, carbs: 0.084, fat: 0.002, estimated: true },
  { id: 'plum', name: 'Ameixa', baseUnit: 'un', calories: 30.0, protein: 0.5, carbs: 7.5, fat: 0.2, estimated: true },
  { id: 'avocado', name: 'Abacate', baseUnit: 'g', calories: 1.6, protein: 0.02, carbs: 0.085, fat: 0.147, estimated: true },
  { id: 'fruit_assorted_max_40g_carbs', name: 'Outra fruta (até 40 g de carboidratos)', baseUnit: 'portion', calories: null, protein: null, carbs: null, fat: null, estimated: false },
  { id: 'grated_cheese', name: 'Queijo ralado', baseUnit: 'tbsp', calories: 21.0, protein: 1.5, carbs: 0.2, fat: 1.6, estimated: true },
  { id: 'baking_powder', name: 'Fermento químico', baseUnit: 'tsp', calories: 2.0, protein: 0.0, carbs: 0.5, fat: 0.0, estimated: true },
  { id: 'chocolate', name: 'Chocolate', baseUnit: 'g', calories: 5.4, protein: 0.07, carbs: 0.5, fat: 0.32, estimated: true },
  { id: 'xanthan_gum', name: 'Goma xantana', baseUnit: 'tsp', calories: 8.0, protein: 0.0, carbs: 2.0, fat: 0.0, estimated: true },
  { id: 'olive_oil', name: 'Azeite', baseUnit: 'g', calories: 8.84, protein: 0.0, carbs: 0.0, fat: 1.0, estimated: true },
  { id: 'light_salt', name: 'Sal light', baseUnit: 'g', calories: 0.0, protein: 0.0, carbs: 0.0, fat: 0.0, estimated: true },
  { id: 'zero_calorie_sauce', name: 'Molho zero calorias', baseUnit: 'g', calories: 0.0, protein: 0.0, carbs: 0.0, fat: 0.0, estimated: true },
]

interface MealSeed {
  id: string
  name: string
  selectionMode: DietSelectionMode
  selectionRules: Record<string, number>
  optionalSides?: string[]
}

const SEED_MEALS: MealSeed[] = [
  { id: 'meal_1', name: 'Café da manhã', selectionMode: 'one_from_each_category', selectionRules: { protein: 1, carbohydrate: 1 } },
  { id: 'meal_2', name: 'Almoço', selectionMode: 'one_from_each_category', selectionRules: { protein: 1, carbohydrate: 1 }, optionalSides: ['vegetables_unlimited'] },
  // A fonte usa a chave "option" (singular) em selection_rules mas "options"
  // (plural) em plan_options — normalizado para "options" nos dois lados,
  // que é o que o formulário de registro usa para casar categoria e opções.
  { id: 'meal_3', name: 'Lanche da tarde', selectionMode: 'one_option', selectionRules: { options: 1 } },
  { id: 'meal_4', name: 'Jantar', selectionMode: 'one_from_each_category', selectionRules: { protein: 1, carbohydrate: 1 }, optionalSides: ['vegetables_unlimited'] },
  { id: 'meal_5', name: 'Ceia', selectionMode: 'one_option', selectionRules: { options: 1 } },
]

interface OptionSeed {
  id: string
  mealId: string
  category: string
  name: string
  ingredients: DietIngredient[]
  alternativeIngredients?: DietIngredient[]
  alternativeLogic?: string
  notes?: string[]
  preparation?: string
}

const SEED_OPTIONS: OptionSeed[] = [
  // --- meal_1: Café da manhã -------------------------------------------
  {
    id: 'meal1_protein_01',
    mealId: 'meal_1',
    category: 'protein',
    name: 'Ovos + claras + whey',
    ingredients: [
      { foodId: 'egg_whole', quantity: 4, unit: 'un' },
      { foodId: 'egg_white', quantity: 2, unit: 'un' },
      { foodId: 'whey_protein', quantity: 15, unit: 'g' },
    ],
  },
  {
    id: 'meal1_protein_02',
    mealId: 'meal_1',
    category: 'protein',
    name: 'Frango desfiado',
    ingredients: [{ foodId: 'chicken_shredded', quantity: 130, unit: 'g' }],
  },
  {
    id: 'meal1_protein_03',
    mealId: 'meal_1',
    category: 'protein',
    name: 'Whey protein',
    ingredients: [{ foodId: 'whey_protein', quantity: 60, unit: 'g' }],
  },
  {
    id: 'meal1_protein_04',
    mealId: 'meal_1',
    category: 'protein',
    name: 'Atum',
    ingredients: [{ foodId: 'tuna_water_or_fresh', quantity: 150, unit: 'g' }],
  },
  {
    id: 'meal1_carb_01',
    mealId: 'meal_1',
    category: 'carbohydrate',
    name: 'Tapioca',
    ingredients: [{ foodId: 'tapioca', quantity: 65, unit: 'g' }],
  },
  {
    id: 'meal1_carb_02',
    mealId: 'meal_1',
    category: 'carbohydrate',
    name: 'Pão francês + fruta',
    ingredients: [
      { foodId: 'french_bread', quantity: 1.5, unit: 'un' },
      { foodId: 'kiwi', quantity: 1, unit: 'un', alternativeGroup: 'fruit' },
      { foodId: 'papaya', quantity: 0.5, unit: 'un', alternativeGroup: 'fruit' },
    ],
    alternativeLogic: 'Escolha 1 kiwi OU 1/2 mamão papaia.',
  },
  {
    id: 'meal1_carb_03',
    mealId: 'meal_1',
    category: 'carbohydrate',
    name: 'Pão integral',
    ingredients: [{ foodId: 'wholegrain_bread', quantity: 4, unit: 'fatia' }],
  },
  {
    id: 'meal1_carb_04',
    mealId: 'meal_1',
    category: 'carbohydrate',
    name: 'Mix de frutas',
    ingredients: [
      { foodId: 'banana_prata', quantity: 1, unit: 'un' },
      { foodId: 'grapes', quantity: 100, unit: 'g' },
      { foodId: 'strawberries', quantity: 100, unit: 'g' },
    ],
    alternativeLogic: 'Pode usar outra fruta/combinação que não passe de 40 g de carboidrato.',
  },

  // --- meal_2: Almoço -----------------------------------------------------
  {
    id: 'meal2_carb_01',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Arroz + feijão',
    ingredients: [
      { foodId: 'rice_cooked', quantity: 80, unit: 'g' },
      { foodId: 'beans_cooked', quantity: 200, unit: 'g' },
    ],
  },
  {
    id: 'meal2_carb_02',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Arroz',
    ingredients: [{ foodId: 'rice_cooked', quantity: 135, unit: 'g' }],
    notes: ['Use quando não for comer arroz com feijão.'],
  },
  {
    id: 'meal2_carb_03',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Purê de batata',
    ingredients: [{ foodId: 'mashed_potato', quantity: 180, unit: 'g' }],
  },
  {
    id: 'meal2_carb_04',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Mandioca',
    ingredients: [{ foodId: 'cassava_cooked', quantity: 130, unit: 'g' }],
  },
  {
    id: 'meal2_carb_05',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Macarrão',
    ingredients: [{ foodId: 'pasta_cooked', quantity: 160, unit: 'g' }],
    alternativeIngredients: [{ foodId: 'mandioquinha_cooked', quantity: 150, unit: 'g' }],
    alternativeLogic: 'Escolha 160 g de macarrão OU 150 g de mandioquinha cozida.',
  },
  {
    id: 'meal2_protein_01',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Sobrecoxa assada',
    ingredients: [{ foodId: 'chicken_thigh_roasted_skinless_boneless', quantity: 160, unit: 'g' }],
  },
  {
    id: 'meal2_protein_02',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Filé de frango grelhado',
    ingredients: [
      { foodId: 'chicken_breast_grilled', quantity: 135, unit: 'g' },
      { foodId: 'olive_oil', quantity: 1, unit: 'fio', estimated: true },
    ],
  },
  {
    id: 'meal2_protein_03',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Tilápia grelhada',
    ingredients: [{ foodId: 'tilapia_grilled', quantity: 220, unit: 'g' }],
  },
  {
    id: 'meal2_protein_04',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Patinho',
    ingredients: [{ foodId: 'ground_beef_patinho', quantity: 140, unit: 'g' }],
  },
  {
    id: 'meal2_protein_05',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Lombo suíno',
    ingredients: [{ foodId: 'pork_loin_cooked', quantity: 200, unit: 'g' }],
    notes: [
      'Acrescente folhas à vontade e 100 g de legumes no vapor.',
      'Não use azeite; use sal light, limão e/ou molho zero calorias.',
    ],
  },

  // --- meal_3: Lanche da tarde ---------------------------------------------
  {
    id: 'meal3_option_01',
    mealId: 'meal_3',
    category: 'options',
    name: 'Shake de whey + leite + abacate',
    ingredients: [
      { foodId: 'whey_protein', quantity: 60, unit: 'g' },
      { foodId: 'skim_milk', quantity: 200, unit: 'ml' },
      { foodId: 'avocado', quantity: 100, unit: 'g' },
    ],
    alternativeIngredients: [
      { foodId: 'banana_prata', quantity: 1, unit: 'un' },
      { foodId: 'oats', quantity: 50, unit: 'g' },
    ],
    alternativeLogic: 'Banana + aveia como alternativa ao abacate.',
  },
  {
    id: 'meal3_option_02',
    mealId: 'meal_3',
    category: 'options',
    name: 'Panqueca de whey',
    ingredients: [
      { foodId: 'banana_large', quantity: 1, unit: 'un' },
      { foodId: 'skim_milk', quantity: 200, unit: 'ml' },
      { foodId: 'oats', quantity: 40, unit: 'g' },
      { foodId: 'whey_protein', quantity: 30, unit: 'g' },
      { foodId: 'egg_whole', quantity: 1, unit: 'un' },
    ],
    preparation: 'Bata todos os ingredientes e cozinhe em fogo baixo numa frigideira antiaderente.',
  },
  {
    id: 'meal3_option_03',
    mealId: 'meal_3',
    category: 'options',
    name: 'Salada de frutas proteica',
    ingredients: [
      { foodId: 'apple', quantity: 0.5, unit: 'un' },
      { foodId: 'grapes', quantity: 50, unit: 'g' },
      { foodId: 'melon', quantity: 100, unit: 'g' },
      { foodId: 'strawberries', quantity: 100, unit: 'g' },
      { foodId: 'oats', quantity: 20, unit: 'g' },
      { foodId: 'whey_protein', quantity: 60, unit: 'g' },
    ],
    alternativeLogic: 'A fonte permite 100 g de morango OU ameixa.',
  },
  {
    id: 'meal3_option_04',
    mealId: 'meal_3',
    category: 'options',
    name: 'Pão de frango',
    ingredients: [
      { foodId: 'chicken_shredded', quantity: 120, unit: 'g' },
      { foodId: 'egg_whole', quantity: 1, unit: 'un' },
      { foodId: 'grated_cheese', quantity: 1, unit: 'tbsp' },
      { foodId: 'baking_powder', quantity: 1, unit: 'tsp' },
    ],
    preparation: 'Bata no liquidificador, coloque num refratário e microondas por 3 minutos. Opcional: tostar na frigideira depois.',
  },

  // --- meal_4: Jantar (mesmas opções de carboidrato/proteína do almoço, exceto sobrecoxa) --
  {
    id: 'meal4_carb_01',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Arroz + feijão',
    ingredients: [
      { foodId: 'rice_cooked', quantity: 80, unit: 'g' },
      { foodId: 'beans_cooked', quantity: 200, unit: 'g' },
    ],
  },
  {
    id: 'meal4_carb_02',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Arroz',
    ingredients: [{ foodId: 'rice_cooked', quantity: 135, unit: 'g' }],
    notes: ['Use quando não for comer arroz com feijão.'],
  },
  {
    id: 'meal4_carb_03',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Purê de batata',
    ingredients: [{ foodId: 'mashed_potato', quantity: 180, unit: 'g' }],
  },
  {
    id: 'meal4_carb_04',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Mandioca',
    ingredients: [{ foodId: 'cassava_cooked', quantity: 130, unit: 'g' }],
  },
  {
    id: 'meal4_carb_05',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Macarrão',
    ingredients: [{ foodId: 'pasta_cooked', quantity: 160, unit: 'g' }],
    alternativeIngredients: [{ foodId: 'mandioquinha_cooked', quantity: 150, unit: 'g' }],
    alternativeLogic: 'Escolha 160 g de macarrão OU 150 g de mandioquinha cozida.',
  },
  {
    id: 'meal4_protein_01',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Filé de frango grelhado',
    ingredients: [
      { foodId: 'chicken_breast_grilled', quantity: 135, unit: 'g' },
      { foodId: 'olive_oil', quantity: 1, unit: 'fio', estimated: true },
    ],
  },
  {
    id: 'meal4_protein_02',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Tilápia grelhada',
    ingredients: [{ foodId: 'tilapia_grilled', quantity: 220, unit: 'g' }],
  },
  {
    id: 'meal4_protein_03',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Patinho',
    ingredients: [{ foodId: 'ground_beef_patinho', quantity: 140, unit: 'g' }],
  },
  {
    id: 'meal4_protein_04',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Lombo suíno',
    ingredients: [{ foodId: 'pork_loin_cooked', quantity: 200, unit: 'g' }],
    notes: [
      'Acrescente folhas à vontade e 100 g de legumes no vapor.',
      'Não use azeite; use sal light, limão e/ou molho zero calorias.',
    ],
  },

  // --- meal_5: Ceia ---------------------------------------------------------
  {
    id: 'meal5_option_01',
    mealId: 'meal_5',
    category: 'options',
    name: 'Pasta de amendoim + whey + iogurte',
    ingredients: [
      { foodId: 'peanut_butter', quantity: 50, unit: 'g' },
      { foodId: 'whey_protein', quantity: 60, unit: 'g' },
      { foodId: 'light_greek_yogurt', quantity: 170, unit: 'ml' },
    ],
  },
  {
    id: 'meal5_option_02',
    mealId: 'meal_5',
    category: 'options',
    name: 'Mousse de chocolate fake',
    ingredients: [
      { foodId: 'light_greek_yogurt', quantity: 1, unit: 'un_serving', estimated: true },
      { foodId: 'whey_protein', quantity: 30, unit: 'g' },
      { foodId: 'chocolate', quantity: 30, unit: 'g' },
      { foodId: 'xanthan_gum', quantity: 1, unit: 'tsp' },
    ],
    preparation: 'Misture todos os ingredientes e leve à geladeira. Deixe o chocolate derretido esfriar antes de misturar com o iogurte.',
  },
  {
    id: 'meal5_option_03',
    mealId: 'meal_5',
    category: 'options',
    name: 'Salmão',
    ingredients: [{ foodId: 'salmon_grilled', quantity: 170, unit: 'g' }],
    alternativeIngredients: [{ foodId: 'salmon_raw', quantity: 150, unit: 'g' }],
    alternativeLogic: 'Escolha 170 g de salmão grelhado OU 150 g de salmão cru.',
  },
  {
    id: 'meal5_option_04',
    mealId: 'meal_5',
    category: 'options',
    name: 'Pão de frango',
    ingredients: [
      { foodId: 'chicken_shredded', quantity: 120, unit: 'g' },
      { foodId: 'egg_whole', quantity: 1, unit: 'un' },
      { foodId: 'grated_cheese', quantity: 1, unit: 'tbsp' },
      { foodId: 'baking_powder', quantity: 1, unit: 'tsp' },
    ],
    preparation: 'Bata no liquidificador, coloque num refratário e microondas por 3 minutos. Opcional: tostar na frigideira depois.',
  },
]

/** Só para exibição na tela de registro — sem rastreamento de nutrição. */
export const VEGETABLES_UNLIMITED: string[] = [
  'Alface', 'Cebola', 'Pepino', 'Brócolis', 'Chuchu', 'Tomate', 'Agrião',
  'Chicória', 'Rabanete', 'Palmito', 'Pimentão', 'Vagem', 'Acelga', 'Couve',
  'Repolho', 'Couve-flor', 'Broto de alfafa', 'Quiabo', 'Almeirão', 'Escarola',
  'Rúcula', 'Berinjela', 'Espinafre', 'Alcachofra',
]

/**
 * Semeia o catálogo de dieta (alimentos, refeições e opções do plano) na
 * primeira execução. Mesmo raciocínio do `ensureHydrationCatalog`: a tabela
 * nasce vazia e, numa instalação nova, o `.upgrade()` do Dexie nunca roda —
 * sem isto a seção Nutrição da aba Saúde abriria sem nada em que tocar.
 */
export async function ensureDietCatalog(): Promise<void> {
  if ((await db.foods.count()) > 0) return

  const now = Date.now()

  const foods: Food[] = SEED_FOODS.map((seed, i) => ({
    id: seed.id,
    name: seed.name,
    baseUnit: seed.baseUnit,
    caloriesPerBaseUnit: seed.calories,
    proteinPerBaseUnit: seed.protein,
    carbsPerBaseUnit: seed.carbs,
    fatPerBaseUnit: seed.fat,
    nutritionEstimated: seed.estimated,
    order: i,
    archived: 0,
    createdAt: now + i,
  }))

  const meals: DietMeal[] = SEED_MEALS.map((seed, i) => ({
    id: seed.id,
    name: seed.name,
    order: i,
    selectionMode: seed.selectionMode,
    selectionRules: seed.selectionRules,
    optionalSides: seed.optionalSides,
  }))

  const optionOrderByMeal = new Map<string, number>()
  const options: DietOption[] = SEED_OPTIONS.map((seed) => {
    const order = optionOrderByMeal.get(seed.mealId) ?? 0
    optionOrderByMeal.set(seed.mealId, order + 1)
    return {
      id: seed.id,
      mealId: seed.mealId,
      category: seed.category,
      name: seed.name,
      order,
      ingredients: seed.ingredients,
      alternativeIngredients: seed.alternativeIngredients,
      alternativeLogic: seed.alternativeLogic,
      notes: seed.notes,
      preparation: seed.preparation,
    }
  })

  await db.foods.bulkAdd(foods)
  await db.dietMeals.bulkAdd(meals)
  await db.dietOptions.bulkAdd(options)
}
