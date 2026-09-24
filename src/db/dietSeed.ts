import { db, type DietIngredient, type DietMeal, type DietOption, type DietSelectionMode, type Food } from './db'

/**
 * Alimentos da **dieta anterior** (`HIPERTRON - DIETA 2200-2400 KCAL`),
 * transcritos dela já calculados. Ficam no catálogo mesmo depois da troca de
 * dieta: os registros antigos apontam para estes ids, e todos continuam
 * lançáveis numa refeição livre. Nutrição por unidade-base; `null` quando a
 * fonte não define (fruta variável do dia).
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

/**
 * Catálogo geral de alimentos comuns no Brasil, para registrar refeição livre
 * — o que se come fora do plano: um lanche na rua, a pizza do fim de semana,
 * a fruta que apareceu na feira.
 *
 * Diferença de natureza para o bloco acima: lá os números vêm da dieta
 * prescrita, aqui são **médias**. Prato feito, sanduíche de lanchonete e
 * fatia de pizza variam muito de casa para casa — o valor aqui é o do caso
 * típico, o suficiente para o total do dia não ficar cego, não uma medição da
 * porção que foi comida. Por isso todos entram com `estimated: true`.
 *
 * A unidade-base de cada um é a que a pessoa consegue contar sem balança na
 * mão: `un` para o que vem inteiro (um ovo frito, um pão de queijo), `fatia`
 * para o que vem fatiado (pizza, presunto, bolo), `tbsp` para condimento e
 * `g`/`ml` só quando o alimento é mesmo pesado ou medido. Isso importa: a
 * nutrição só é contada quando a unidade lançada bate com esta.
 */
const EXTRA_FOODS: FoodSeed[] = [
  // --- Frutas ----------------------------------------------------------
  { id: 'orange', name: 'Laranja', baseUnit: 'un', calories: 62.0, protein: 1.2, carbs: 15.4, fat: 0.2, estimated: true },
  { id: 'tangerine', name: 'Mexerica (tangerina)', baseUnit: 'un', calories: 50.0, protein: 0.8, carbs: 13.0, fat: 0.3, estimated: true },
  { id: 'lime', name: 'Limão', baseUnit: 'un', calories: 20.0, protein: 0.5, carbs: 7.0, fat: 0.2, estimated: true },
  { id: 'watermelon', name: 'Melancia', baseUnit: 'g', calories: 0.3, protein: 0.006, carbs: 0.076, fat: 0.002, estimated: true },
  { id: 'pineapple', name: 'Abacaxi', baseUnit: 'g', calories: 0.5, protein: 0.005, carbs: 0.13, fat: 0.001, estimated: true },
  { id: 'mango', name: 'Manga', baseUnit: 'un', calories: 135.0, protein: 1.8, carbs: 35.0, fat: 0.6, estimated: true },
  { id: 'guava', name: 'Goiaba', baseUnit: 'un', calories: 95.0, protein: 3.6, carbs: 20.0, fat: 1.4, estimated: true },
  { id: 'papaya_formosa_slice', name: 'Mamão formosa (fatia)', baseUnit: 'fatia', calories: 65.0, protein: 0.8, carbs: 16.0, fat: 0.2, estimated: true },
  { id: 'pear', name: 'Pera', baseUnit: 'un', calories: 100.0, protein: 0.6, carbs: 27.0, fat: 0.2, estimated: true },
  { id: 'peach', name: 'Pêssego', baseUnit: 'un', calories: 58.0, protein: 1.4, carbs: 14.0, fat: 0.4, estimated: true },
  { id: 'persimmon', name: 'Caqui', baseUnit: 'un', calories: 105.0, protein: 0.9, carbs: 27.0, fat: 0.3, estimated: true },
  { id: 'acerola', name: 'Acerola', baseUnit: 'g', calories: 0.32, protein: 0.004, carbs: 0.076, fat: 0.003, estimated: true },
  { id: 'passion_fruit_pulp', name: 'Maracujá (polpa)', baseUnit: 'g', calories: 0.68, protein: 0.02, carbs: 0.13, fat: 0.007, estimated: true },
  { id: 'acai_pulp', name: 'Polpa de açaí sem açúcar', baseUnit: 'g', calories: 0.58, protein: 0.008, carbs: 0.06, fat: 0.035, estimated: true },
  { id: 'coconut_fresh', name: 'Coco fresco', baseUnit: 'g', calories: 3.54, protein: 0.033, carbs: 0.15, fat: 0.335, estimated: true },

  // --- Legumes, raízes e leguminosas ------------------------------------
  { id: 'potato_cooked', name: 'Batata cozida', baseUnit: 'g', calories: 0.86, protein: 0.02, carbs: 0.2, fat: 0.001, estimated: true },
  { id: 'sweet_potato_cooked', name: 'Batata doce cozida', baseUnit: 'g', calories: 0.86, protein: 0.016, carbs: 0.2, fat: 0.001, estimated: true },
  { id: 'yam_cooked', name: 'Inhame cozido', baseUnit: 'g', calories: 1.18, protein: 0.015, carbs: 0.28, fat: 0.001, estimated: true },
  { id: 'corn_cooked', name: 'Milho verde cozido', baseUnit: 'g', calories: 0.98, protein: 0.033, carbs: 0.21, fat: 0.012, estimated: true },
  { id: 'peas_cooked', name: 'Ervilha cozida', baseUnit: 'g', calories: 0.81, protein: 0.054, carbs: 0.14, fat: 0.004, estimated: true },
  { id: 'carrot_cooked', name: 'Cenoura cozida', baseUnit: 'g', calories: 0.35, protein: 0.008, carbs: 0.08, fat: 0.002, estimated: true },
  { id: 'beet_cooked', name: 'Beterraba cozida', baseUnit: 'g', calories: 0.44, protein: 0.017, carbs: 0.1, fat: 0.002, estimated: true },
  { id: 'pumpkin_cooked', name: 'Abóbora cozida', baseUnit: 'g', calories: 0.4, protein: 0.01, carbs: 0.09, fat: 0.001, estimated: true },
  { id: 'lentils_cooked', name: 'Lentilha cozida', baseUnit: 'g', calories: 1.16, protein: 0.09, carbs: 0.2, fat: 0.004, estimated: true },
  { id: 'chickpeas_cooked', name: 'Grão-de-bico cozido', baseUnit: 'g', calories: 1.64, protein: 0.089, carbs: 0.27, fat: 0.026, estimated: true },

  // --- Pães, massas e outros carboidratos --------------------------------
  { id: 'white_sandwich_bread', name: 'Pão de forma branco', baseUnit: 'fatia', calories: 70.0, protein: 2.2, carbs: 13.0, fat: 0.9, estimated: true },
  { id: 'hamburger_bun', name: 'Pão de hambúrguer', baseUnit: 'un', calories: 140.0, protein: 4.5, carbs: 26.0, fat: 2.2, estimated: true },
  { id: 'hotdog_bun', name: 'Pão de hot dog', baseUnit: 'un', calories: 145.0, protein: 4.5, carbs: 26.0, fat: 2.5, estimated: true },
  { id: 'cheese_bread', name: 'Pão de queijo', baseUnit: 'un', calories: 100.0, protein: 2.3, carbs: 10.0, fat: 5.5, estimated: true },
  { id: 'wrap_tortilla', name: 'Wrap / tortilha', baseUnit: 'un', calories: 150.0, protein: 4.0, carbs: 25.0, fat: 3.5, estimated: true },
  { id: 'toast', name: 'Torrada', baseUnit: 'un', calories: 30.0, protein: 0.9, carbs: 5.5, fat: 0.5, estimated: true },
  { id: 'cream_cracker', name: 'Biscoito água e sal', baseUnit: 'un', calories: 30.0, protein: 0.6, carbs: 5.0, fat: 0.9, estimated: true },
  { id: 'filled_cookie', name: 'Biscoito recheado', baseUnit: 'un', calories: 70.0, protein: 0.7, carbs: 10.0, fat: 3.0, estimated: true },
  { id: 'brown_rice_cooked', name: 'Arroz integral cozido', baseUnit: 'g', calories: 1.24, protein: 0.026, carbs: 0.26, fat: 0.01, estimated: true },
  { id: 'couscous_corn', name: 'Cuscuz de milho (flocão)', baseUnit: 'g', calories: 1.13, protein: 0.023, carbs: 0.25, fat: 0.005, estimated: true },
  { id: 'polenta', name: 'Polenta cozida', baseUnit: 'g', calories: 0.85, protein: 0.02, carbs: 0.19, fat: 0.003, estimated: true },
  { id: 'cassava_flour', name: 'Farinha de mandioca', baseUnit: 'g', calories: 3.6, protein: 0.015, carbs: 0.85, fat: 0.003, estimated: true },
  { id: 'farofa', name: 'Farofa pronta', baseUnit: 'g', calories: 4.1, protein: 0.04, carbs: 0.6, fat: 0.17, estimated: true },
  { id: 'instant_noodles', name: 'Macarrão instantâneo (pacote)', baseUnit: 'un', calories: 370.0, protein: 8.0, carbs: 52.0, fat: 14.0, estimated: true },

  // --- Carnes, ovos e frios ---------------------------------------------
  { id: 'beef_striploin_grilled', name: 'Contrafilé grelhado', baseUnit: 'g', calories: 2.2, protein: 0.28, carbs: 0.0, fat: 0.12, estimated: true },
  { id: 'beef_rump_grilled', name: 'Alcatra grelhada', baseUnit: 'g', calories: 2.05, protein: 0.3, carbs: 0.0, fat: 0.095, estimated: true },
  { id: 'picanha_roasted', name: 'Picanha assada', baseUnit: 'g', calories: 2.9, protein: 0.26, carbs: 0.0, fat: 0.21, estimated: true },
  { id: 'ground_beef_cooked', name: 'Carne moída refogada', baseUnit: 'g', calories: 2.12, protein: 0.26, carbs: 0.01, fat: 0.12, estimated: true },
  { id: 'beef_milanesa', name: 'Bife à milanesa', baseUnit: 'g', calories: 2.6, protein: 0.2, carbs: 0.14, fat: 0.14, estimated: true },
  { id: 'chicken_drumstick_roasted', name: 'Coxa de frango assada com pele', baseUnit: 'g', calories: 2.16, protein: 0.27, carbs: 0.0, fat: 0.115, estimated: true },
  { id: 'chicken_milanesa', name: 'Frango à milanesa', baseUnit: 'g', calories: 2.4, protein: 0.2, carbs: 0.13, fat: 0.12, estimated: true },
  { id: 'chicken_nuggets', name: 'Nuggets de frango', baseUnit: 'un', calories: 55.0, protein: 2.8, carbs: 3.0, fat: 3.3, estimated: true },
  { id: 'egg_fried', name: 'Ovo frito', baseUnit: 'un', calories: 90.0, protein: 6.3, carbs: 0.4, fat: 7.0, estimated: true },
  { id: 'shrimp_cooked', name: 'Camarão cozido', baseUnit: 'g', calories: 0.99, protein: 0.24, carbs: 0.002, fat: 0.003, estimated: true },
  { id: 'sardine_canned', name: 'Sardinha em lata escorrida', baseUnit: 'g', calories: 2.08, protein: 0.25, carbs: 0.0, fat: 0.115, estimated: true },
  { id: 'pork_sausage_grilled', name: 'Linguiça toscana grelhada', baseUnit: 'g', calories: 2.9, protein: 0.17, carbs: 0.01, fat: 0.24, estimated: true },
  { id: 'hot_dog_sausage', name: 'Salsicha', baseUnit: 'un', calories: 140.0, protein: 5.0, carbs: 2.0, fat: 12.0, estimated: true },
  { id: 'bacon_fried', name: 'Bacon frito', baseUnit: 'g', calories: 5.4, protein: 0.37, carbs: 0.014, fat: 0.42, estimated: true },
  { id: 'ham_slice', name: 'Presunto (fatia)', baseUnit: 'fatia', calories: 25.0, protein: 2.6, carbs: 0.3, fat: 1.4, estimated: true },
  { id: 'turkey_breast_slice', name: 'Peito de peru defumado (fatia)', baseUnit: 'fatia', calories: 17.0, protein: 2.7, carbs: 0.4, fat: 0.3, estimated: true },
  { id: 'mortadella_slice', name: 'Mortadela (fatia)', baseUnit: 'fatia', calories: 60.0, protein: 3.0, carbs: 0.6, fat: 5.0, estimated: true },
  { id: 'beef_burger_patty', name: 'Hambúrguer bovino (só a carne)', baseUnit: 'un', calories: 230.0, protein: 17.0, carbs: 1.0, fat: 17.0, estimated: true },
  { id: 'chicken_burger_patty', name: 'Hambúrguer de frango (só a carne)', baseUnit: 'un', calories: 170.0, protein: 15.0, carbs: 5.0, fat: 10.0, estimated: true },
  { id: 'protein_bar', name: 'Barra de proteína', baseUnit: 'un', calories: 200.0, protein: 20.0, carbs: 20.0, fat: 6.0, estimated: true },

  // --- Queijos e laticínios ---------------------------------------------
  { id: 'mozzarella_slice', name: 'Queijo mussarela (fatia)', baseUnit: 'fatia', calories: 55.0, protein: 3.8, carbs: 0.4, fat: 4.2, estimated: true },
  { id: 'prato_cheese_slice', name: 'Queijo prato (fatia)', baseUnit: 'fatia', calories: 65.0, protein: 4.2, carbs: 0.3, fat: 5.2, estimated: true },
  { id: 'cheddar_slice', name: 'Queijo cheddar (fatia)', baseUnit: 'fatia', calories: 75.0, protein: 4.3, carbs: 0.5, fat: 6.2, estimated: true },
  { id: 'minas_frescal_cheese', name: 'Queijo minas frescal', baseUnit: 'g', calories: 2.64, protein: 0.176, carbs: 0.032, fat: 0.2, estimated: true },
  { id: 'cottage_cheese', name: 'Queijo cottage', baseUnit: 'g', calories: 0.98, protein: 0.11, carbs: 0.034, fat: 0.043, estimated: true },
  { id: 'requeijao', name: 'Requeijão cremoso', baseUnit: 'g', calories: 2.6, protein: 0.096, carbs: 0.03, fat: 0.23, estimated: true },
  { id: 'cream_cheese', name: 'Cream cheese', baseUnit: 'g', calories: 3.4, protein: 0.06, carbs: 0.04, fat: 0.34, estimated: true },
  { id: 'whole_milk', name: 'Leite integral', baseUnit: 'ml', calories: 0.61, protein: 0.032, carbs: 0.047, fat: 0.033, estimated: true },
  { id: 'plain_yogurt', name: 'Iogurte natural integral', baseUnit: 'ml', calories: 0.61, protein: 0.035, carbs: 0.047, fat: 0.033, estimated: true },
  { id: 'skim_yogurt', name: 'Iogurte natural desnatado', baseUnit: 'ml', calories: 0.41, protein: 0.042, carbs: 0.06, fat: 0.002, estimated: true },
  { id: 'butter', name: 'Manteiga', baseUnit: 'g', calories: 7.17, protein: 0.009, carbs: 0.001, fat: 0.81, estimated: true },
  { id: 'margarine', name: 'Margarina', baseUnit: 'g', calories: 5.9, protein: 0.002, carbs: 0.005, fat: 0.65, estimated: true },
  { id: 'condensed_milk', name: 'Leite condensado', baseUnit: 'g', calories: 3.21, protein: 0.078, carbs: 0.55, fat: 0.087, estimated: true },
  { id: 'dulce_de_leche', name: 'Doce de leite', baseUnit: 'g', calories: 3.15, protein: 0.07, carbs: 0.55, fat: 0.07, estimated: true },
  { id: 'chocolate_powder', name: 'Achocolatado em pó', baseUnit: 'g', calories: 3.9, protein: 0.04, carbs: 0.85, fat: 0.03, estimated: true },

  // --- Lanches e comida de rua ------------------------------------------
  { id: 'burger_plain', name: 'Hambúrguer simples', baseUnit: 'un', calories: 300.0, protein: 15.0, carbs: 30.0, fat: 13.0, estimated: true },
  { id: 'x_burger', name: 'X-burguer', baseUnit: 'un', calories: 400.0, protein: 20.0, carbs: 33.0, fat: 21.0, estimated: true },
  { id: 'x_salada', name: 'X-salada', baseUnit: 'un', calories: 430.0, protein: 21.0, carbs: 35.0, fat: 23.0, estimated: true },
  { id: 'x_bacon', name: 'X-bacon', baseUnit: 'un', calories: 500.0, protein: 24.0, carbs: 34.0, fat: 30.0, estimated: true },
  { id: 'x_tudo', name: 'X-tudo', baseUnit: 'un', calories: 700.0, protein: 32.0, carbs: 48.0, fat: 42.0, estimated: true },
  { id: 'hot_dog_complete', name: 'Hot dog completo', baseUnit: 'un', calories: 350.0, protein: 13.0, carbs: 40.0, fat: 15.0, estimated: true },
  { id: 'misto_quente', name: 'Misto quente', baseUnit: 'un', calories: 290.0, protein: 14.0, carbs: 27.0, fat: 14.0, estimated: true },
  { id: 'natural_sandwich', name: 'Sanduíche natural', baseUnit: 'un', calories: 280.0, protein: 14.0, carbs: 32.0, fat: 10.0, estimated: true },
  { id: 'pizza_mozzarella_slice', name: 'Pizza de mussarela (fatia)', baseUnit: 'fatia', calories: 270.0, protein: 12.0, carbs: 30.0, fat: 11.0, estimated: true },
  { id: 'pizza_calabresa_slice', name: 'Pizza de calabresa (fatia)', baseUnit: 'fatia', calories: 300.0, protein: 13.0, carbs: 29.0, fat: 14.0, estimated: true },
  { id: 'pizza_chicken_catupiry_slice', name: 'Pizza de frango com catupiry (fatia)', baseUnit: 'fatia', calories: 310.0, protein: 15.0, carbs: 29.0, fat: 15.0, estimated: true },
  { id: 'pizza_portuguesa_slice', name: 'Pizza portuguesa (fatia)', baseUnit: 'fatia', calories: 290.0, protein: 14.0, carbs: 29.0, fat: 13.0, estimated: true },
  { id: 'french_fries', name: 'Batata frita', baseUnit: 'g', calories: 3.12, protein: 0.035, carbs: 0.41, fat: 0.15, estimated: true },
  { id: 'coxinha', name: 'Coxinha', baseUnit: 'un', calories: 230.0, protein: 8.0, carbs: 25.0, fat: 11.0, estimated: true },
  { id: 'pastel_de_carne', name: 'Pastel de carne', baseUnit: 'un', calories: 320.0, protein: 10.0, carbs: 30.0, fat: 18.0, estimated: true },
  { id: 'esfiha_de_carne', name: 'Esfiha de carne', baseUnit: 'un', calories: 180.0, protein: 8.0, carbs: 22.0, fat: 6.0, estimated: true },
  { id: 'empada_de_frango', name: 'Empada de frango', baseUnit: 'un', calories: 230.0, protein: 6.0, carbs: 20.0, fat: 14.0, estimated: true },
  { id: 'kibe_frito', name: 'Kibe frito', baseUnit: 'un', calories: 180.0, protein: 8.0, carbs: 14.0, fat: 10.0, estimated: true },
  { id: 'acai_bowl_cream', name: 'Açaí batido (creme)', baseUnit: 'g', calories: 2.0, protein: 0.01, carbs: 0.3, fat: 0.09, estimated: true },

  // --- Pratos prontos ----------------------------------------------------
  { id: 'feijoada', name: 'Feijoada', baseUnit: 'g', calories: 1.7, protein: 0.11, carbs: 0.09, fat: 0.1, estimated: true },
  { id: 'chicken_stroganoff', name: 'Strogonoff de frango', baseUnit: 'g', calories: 1.55, protein: 0.11, carbs: 0.06, fat: 0.1, estimated: true },
  { id: 'lasagna_bolognese', name: 'Lasanha à bolonhesa', baseUnit: 'g', calories: 1.65, protein: 0.09, carbs: 0.15, fat: 0.075, estimated: true },
  { id: 'chicken_parmegiana', name: 'Frango à parmegiana', baseUnit: 'g', calories: 2.0, protein: 0.145, carbs: 0.1, fat: 0.11, estimated: true },
  { id: 'fish_moqueca', name: 'Moqueca de peixe', baseUnit: 'g', calories: 1.3, protein: 0.11, carbs: 0.03, fat: 0.08, estimated: true },
  { id: 'meat_pancake', name: 'Panqueca de carne', baseUnit: 'un', calories: 210.0, protein: 11.0, carbs: 18.0, fat: 10.0, estimated: true },
  { id: 'mayo_potato_salad', name: 'Salada de maionese', baseUnit: 'g', calories: 1.6, protein: 0.02, carbs: 0.1, fat: 0.12, estimated: true },
  { id: 'vegetable_soup', name: 'Sopa de legumes', baseUnit: 'g', calories: 0.45, protein: 0.02, carbs: 0.06, fat: 0.015, estimated: true },

  // --- Doces --------------------------------------------------------------
  { id: 'brigadeiro', name: 'Brigadeiro', baseUnit: 'un', calories: 100.0, protein: 1.2, carbs: 15.0, fat: 4.0, estimated: true },
  { id: 'pudim_slice', name: 'Pudim de leite (fatia)', baseUnit: 'fatia', calories: 240.0, protein: 6.0, carbs: 38.0, fat: 7.0, estimated: true },
  { id: 'chocolate_cake_slice', name: 'Bolo de chocolate (fatia)', baseUnit: 'fatia', calories: 290.0, protein: 4.0, carbs: 42.0, fat: 12.0, estimated: true },
  { id: 'ice_cream', name: 'Sorvete de massa', baseUnit: 'g', calories: 2.07, protein: 0.035, carbs: 0.24, fat: 0.11, estimated: true },
  { id: 'pacoca', name: 'Paçoca', baseUnit: 'un', calories: 95.0, protein: 2.5, carbs: 10.0, fat: 5.0, estimated: true },
  { id: 'sugar', name: 'Açúcar', baseUnit: 'g', calories: 3.87, protein: 0.0, carbs: 1.0, fat: 0.0, estimated: true },
  { id: 'honey', name: 'Mel', baseUnit: 'g', calories: 3.04, protein: 0.003, carbs: 0.82, fat: 0.0, estimated: true },

  // --- Oleaginosas e gorduras ---------------------------------------------
  { id: 'cashew_nuts', name: 'Castanha de caju', baseUnit: 'g', calories: 5.53, protein: 0.18, carbs: 0.3, fat: 0.44, estimated: true },
  { id: 'brazil_nuts', name: 'Castanha-do-pará', baseUnit: 'g', calories: 6.56, protein: 0.14, carbs: 0.12, fat: 0.66, estimated: true },
  { id: 'peanuts', name: 'Amendoim', baseUnit: 'g', calories: 5.67, protein: 0.26, carbs: 0.16, fat: 0.49, estimated: true },
  { id: 'almonds', name: 'Amêndoas', baseUnit: 'g', calories: 5.79, protein: 0.21, carbs: 0.22, fat: 0.5, estimated: true },
  { id: 'walnuts', name: 'Nozes', baseUnit: 'g', calories: 6.54, protein: 0.15, carbs: 0.14, fat: 0.65, estimated: true },
  { id: 'soybean_oil', name: 'Óleo de soja', baseUnit: 'g', calories: 8.84, protein: 0.0, carbs: 0.0, fat: 1.0, estimated: true },

  // --- Bebidas ------------------------------------------------------------
  // A aba de hidratação tem a sua própria lista de bebidas, com outro
  // propósito (quanto hidrata). Estas existem para a caloria que a bebida
  // carrega — um suco e uma cerveja pesam no total do dia.
  { id: 'orange_juice', name: 'Suco de laranja natural', baseUnit: 'ml', calories: 0.45, protein: 0.007, carbs: 0.104, fat: 0.002, estimated: true },
  { id: 'grape_juice', name: 'Suco de uva integral', baseUnit: 'ml', calories: 0.6, protein: 0.004, carbs: 0.15, fat: 0.001, estimated: true },
  { id: 'coconut_water', name: 'Água de coco', baseUnit: 'ml', calories: 0.19, protein: 0.002, carbs: 0.038, fat: 0.002, estimated: true },
  { id: 'soda', name: 'Refrigerante', baseUnit: 'ml', calories: 0.42, protein: 0.0, carbs: 0.105, fat: 0.0, estimated: true },
  { id: 'diet_soda', name: 'Refrigerante zero', baseUnit: 'ml', calories: 0.0, protein: 0.0, carbs: 0.0, fat: 0.0, estimated: true },
  // Cerveja e vinho têm mais caloria do que a soma dos macros explica: o
  // álcool rende ~7 kcal/g e não é proteína, carboidrato nem gordura.
  { id: 'beer', name: 'Cerveja', baseUnit: 'ml', calories: 0.43, protein: 0.005, carbs: 0.036, fat: 0.0, estimated: true },
  { id: 'red_wine', name: 'Vinho tinto', baseUnit: 'ml', calories: 0.85, protein: 0.001, carbs: 0.026, fat: 0.0, estimated: true },
  { id: 'black_coffee', name: 'Café coado sem açúcar', baseUnit: 'ml', calories: 0.02, protein: 0.001, carbs: 0.003, fat: 0.0, estimated: true },

  // --- Molhos e condimentos ------------------------------------------------
  { id: 'mayonnaise', name: 'Maionese', baseUnit: 'tbsp', calories: 85.0, protein: 0.1, carbs: 0.5, fat: 9.4, estimated: true },
  { id: 'ketchup', name: 'Ketchup', baseUnit: 'tbsp', calories: 15.0, protein: 0.2, carbs: 4.0, fat: 0.02, estimated: true },
  { id: 'mustard', name: 'Mostarda', baseUnit: 'tbsp', calories: 10.0, protein: 0.6, carbs: 0.6, fat: 0.6, estimated: true },
  { id: 'barbecue_sauce', name: 'Molho barbecue', baseUnit: 'tbsp', calories: 30.0, protein: 0.1, carbs: 7.0, fat: 0.1, estimated: true },
  { id: 'tomato_sauce', name: 'Molho de tomate', baseUnit: 'g', calories: 0.6, protein: 0.015, carbs: 0.11, fat: 0.008, estimated: true },
]


/**
 * Alimentos que o `Plano Alimentar — Leonardo Lyra` (08/10/2025 a 08/04/2026)
 * prescreve e que o catálogo ainda não tinha. Mesma natureza do bloco acima:
 * médias, marcadas como estimativa — a prescrição dá a gramagem de cada opção,
 * não a composição de cada alimento.
 */
const PLAN_FOODS: FoodSeed[] = [
  // --- Pães e massas do plano -------------------------------------------
  /*
   * Fatia de 33 g — a prescrição pede 66 g em duas fatias. Os valores não são
   * chute: café da manhã e lanche da tarde repetem o mesmo pão mudando só a
   * quantidade de fruta, então as duas linhas da tabela da p. 3 formam um
   * sistema que resolve pão e fruta de uma vez. Deu 7,6 g de carboidrato por
   * fatia — pouco para um pão comum, coerente para um 18 grãos, que é denso e
   * cheio de semente. A fruta saiu do mesmo sistema em 14,3 g de carboidrato,
   * contra os 12,7 g que a lista de equivalentes dá por conta própria: duas
   * origens independentes chegando perto, o que dá confiança nas duas.
   */
  { id: 'wholegrain_bread_18_grains', name: 'Pão integral 18 grãos (fatia)', baseUnit: 'fatia', calories: 68.0, protein: 3.6, carbs: 7.6, fat: 2.1, estimated: true },
  { id: 'pastel_dough_disc', name: 'Disco de massa de pastel', baseUnit: 'un', calories: 95.0, protein: 2.4, carbs: 17.0, fat: 2.0, estimated: true },

  // --- Carboidratos do almoço e do jantar --------------------------------
  { id: 'seven_grain_rice_cooked', name: 'Arroz 7 grãos cozido', baseUnit: 'g', calories: 1.3, protein: 0.028, carbs: 0.27, fat: 0.011, estimated: true },
  { id: 'parboiled_rice_cooked', name: 'Arroz parboilizado cozido', baseUnit: 'g', calories: 1.23, protein: 0.026, carbs: 0.27, fat: 0.003, estimated: true },
  { id: 'wholegrain_pasta_cooked', name: 'Macarrão integral cozido', baseUnit: 'g', calories: 1.24, protein: 0.051, carbs: 0.25, fat: 0.014, estimated: true },
  { id: 'quinoa_cooked', name: 'Quinoa cozida', baseUnit: 'g', calories: 1.2, protein: 0.044, carbs: 0.213, fat: 0.019, estimated: true },

  // --- Leguminosas do almoço ---------------------------------------------
  // Valores da TACO, do feijão **como se come** — cozido, com o caldo. O
  // `beans_cooked` genérico do catálogo, herdado da dieta anterior, é quase o
  // dobro disto: é grão escorrido e bem seco, que não é o que vai na concha.
  // O azuki é mesmo mais denso que os outros, não é engano de transcrição.
  { id: 'azuki_beans_cooked', name: 'Feijão azuki cozido', baseUnit: 'g', calories: 1.28, protein: 0.076, carbs: 0.25, fat: 0.001, estimated: true },
  { id: 'black_eyed_peas_cooked', name: 'Feijão fradinho cozido', baseUnit: 'g', calories: 0.78, protein: 0.049, carbs: 0.135, fat: 0.005, estimated: true },
  { id: 'black_beans_cooked', name: 'Feijão preto cozido', baseUnit: 'g', calories: 0.77, protein: 0.045, carbs: 0.14, fat: 0.005, estimated: true },
  { id: 'carioca_beans_cooked', name: 'Feijão carioca cozido', baseUnit: 'g', calories: 0.76, protein: 0.048, carbs: 0.136, fat: 0.005, estimated: true },
  { id: 'white_beans_cooked', name: 'Feijão branco cozido', baseUnit: 'g', calories: 0.91, protein: 0.06, carbs: 0.165, fat: 0.005, estimated: true },

  // --- Proteínas do almoço e do jantar ------------------------------------
  { id: 'filet_mignon_grilled', name: 'Filé mignon grelhado', baseUnit: 'g', calories: 2.1, protein: 0.29, carbs: 0.0, fat: 0.1, estimated: true },
  { id: 'maminha_grilled', name: 'Maminha grelhada', baseUnit: 'g', calories: 1.95, protein: 0.28, carbs: 0.0, fat: 0.09, estimated: true },
  { id: 'chicken_drumstick_skinless', name: 'Coxa de frango sem pele', baseUnit: 'g', calories: 1.61, protein: 0.244, carbs: 0.0, fat: 0.062, estimated: true },

  // --- Recheios do lanche --------------------------------------------------
  { id: 'ricotta_cream_light', name: 'Creme de ricota light', baseUnit: 'g', calories: 1.45, protein: 0.09, carbs: 0.03, fat: 0.1, estimated: true },
  { id: 'chicken_pate', name: 'Patê de frango', baseUnit: 'g', calories: 2.1, protein: 0.11, carbs: 0.03, fat: 0.17, estimated: true },

  // --- Guarnições e sobremesa ----------------------------------------------
  // O "3 colheres de servir de legumes" do prato: média do grupo B da p. 15.
  { id: 'cooked_vegetables_mix', name: 'Legumes cozidos (mistura)', baseUnit: 'g', calories: 0.35, protein: 0.016, carbs: 0.06, fat: 0.004, estimated: true },
  { id: 'fruit_popsicle', name: 'Picolé de fruta', baseUnit: 'un', calories: 70.0, protein: 0.3, carbs: 17.0, fat: 0.1, estimated: true },

  /*
   * A unidade em que a prescrição fala de fruta: "1 porção", "2 porções". O
   * número é a média das 40 frutas da lista de equivalentes (p. 12–13), cada
   * uma no peso que a própria lista dá — de 40 g de banana ouro a 180 g de
   * melão. Deu ~12,7 g de carboidrato por porção, que é o que se espera de uma
   * lista de equivalentes: ela é montada justamente para que toda porção
   * carregue o mesmo carboidrato.
   *
   * Quem quiser lançar a fruta exata em vez da média tem as frutas da lista no
   * catálogo, uma a uma.
   */
  { id: 'fruit_portion', name: 'Porção de fruta', baseUnit: 'portion', calories: 55.0, protein: 0.7, carbs: 12.7, fat: 0.3, estimated: true },

  // --- Frutas da lista de equivalentes que faltavam -------------------------
  { id: 'banana_maca', name: 'Banana maçã', baseUnit: 'un', calories: 44.0, protein: 0.6, carbs: 11.5, fat: 0.1, estimated: true },
  { id: 'banana_nanica', name: 'Banana nanica', baseUnit: 'un', calories: 55.0, protein: 0.7, carbs: 14.0, fat: 0.2, estimated: true },
  { id: 'banana_ouro', name: 'Banana ouro', baseUnit: 'un', calories: 46.0, protein: 0.5, carbs: 11.5, fat: 0.1, estimated: true },
  { id: 'banana_terra', name: 'Banana da terra', baseUnit: 'g', calories: 1.28, protein: 0.013, carbs: 0.32, fat: 0.004, estimated: true },
  { id: 'blackberry', name: 'Amora', baseUnit: 'g', calories: 0.43, protein: 0.014, carbs: 0.096, fat: 0.005, estimated: true },
  { id: 'raspberry', name: 'Framboesa', baseUnit: 'g', calories: 0.52, protein: 0.012, carbs: 0.12, fat: 0.007, estimated: true },
  { id: 'blueberry', name: 'Mirtilo', baseUnit: 'g', calories: 0.57, protein: 0.007, carbs: 0.145, fat: 0.003, estimated: true },
  { id: 'cherry', name: 'Cereja', baseUnit: 'g', calories: 0.63, protein: 0.011, carbs: 0.16, fat: 0.002, estimated: true },
  { id: 'cashew_fruit', name: 'Caju (fruta)', baseUnit: 'g', calories: 0.43, protein: 0.008, carbs: 0.11, fat: 0.002, estimated: true },
  { id: 'starfruit', name: 'Carambola', baseUnit: 'g', calories: 0.31, protein: 0.01, carbs: 0.07, fat: 0.003, estimated: true },
  { id: 'fig', name: 'Figo', baseUnit: 'un', calories: 40.0, protein: 0.4, carbs: 10.0, fat: 0.2, estimated: true },
  { id: 'jabuticaba', name: 'Jabuticaba', baseUnit: 'g', calories: 0.58, protein: 0.006, carbs: 0.155, fat: 0.001, estimated: true },
  { id: 'nectarine', name: 'Nectarina', baseUnit: 'un', calories: 44.0, protein: 1.1, carbs: 10.6, fat: 0.3, estimated: true },
  { id: 'pitanga', name: 'Pitanga', baseUnit: 'g', calories: 0.41, protein: 0.01, carbs: 0.1, fat: 0.004, estimated: true },
  { id: 'fruit_salad', name: 'Salada de frutas', baseUnit: 'g', calories: 0.6, protein: 0.007, carbs: 0.15, fat: 0.002, estimated: true },
]

const ALL_FOODS: FoodSeed[] = [...SEED_FOODS, ...EXTRA_FOODS, ...PLAN_FOODS]

interface MealSeed {
  id: string
  name: string
  selectionMode: DietSelectionMode
  selectionRules: Record<string, number>
  optionalSides?: string[]
  fixedIngredients?: DietIngredient[]
  fixedNotes?: string[]
}

/**
 * As quatro refeições do plano. Os ids vêm da dieta anterior de propósito: a
 * ocasião é a mesma, e reaproveitá-los faz o registro antigo de um almoço
 * continuar aparecendo como "Almoço" no histórico em vez de "Refeição
 * removida". O `meal_5` (ceia) não tem correspondente — esta dieta não tem
 * ceia, e os registros dela ficam sem nome, que é o que de fato aconteceu.
 */
const SEED_MEALS: MealSeed[] = [
  { id: 'meal_1', name: 'Café da manhã', selectionMode: 'one_option', selectionRules: { options: 1 } },
  {
    id: 'meal_2',
    name: 'Almoço',
    selectionMode: 'one_from_each_category',
    selectionRules: { carbohydrate: 1, legume: 1, protein: 1 },
    optionalSides: ['vegetables_unlimited'],
    // "Incluir no prato": vale para qualquer combinação escolhida acima.
    fixedIngredients: [
      { foodId: 'cooked_vegetables_mix', quantity: 150, unit: 'g' },
      { foodId: 'olive_oil', quantity: 5, unit: 'g' },
      { foodId: 'fruit_portion', quantity: 1, unit: 'portion' },
    ],
    fixedNotes: [
      'Incluir no prato: salada crua à vontade.',
      'Os legumes são 3 colheres de servir (150 g), cozidos, refogados, grelhados ou assados.',
      'O azeite é 1 colher de sobremesa (5 g).',
    ],
  },
  { id: 'meal_3', name: 'Lanche da tarde', selectionMode: 'one_option', selectionRules: { options: 1 } },
  {
    id: 'meal_4',
    name: 'Jantar',
    selectionMode: 'one_from_each_category',
    // Sem leguminosa: o jantar da prescrição tem só carboidrato e proteína.
    selectionRules: { carbohydrate: 1, protein: 1 },
    optionalSides: ['vegetables_unlimited'],
    fixedIngredients: [
      { foodId: 'cooked_vegetables_mix', quantity: 150, unit: 'g' },
      { foodId: 'olive_oil', quantity: 2, unit: 'g' },
      // A sobremesa é uma entre quatro: todas nascem em 0 e quem comeu digita a
      // quantidade da sua, como já acontece com os ingredientes alternativos.
      { foodId: 'chocolate', quantity: 20, unit: 'g', alternativeGroup: 'sobremesa' },
      { foodId: 'pacoca', quantity: 1, unit: 'un', alternativeGroup: 'sobremesa' },
      { foodId: 'dulce_de_leche', quantity: 20, unit: 'g', alternativeGroup: 'sobremesa' },
      { foodId: 'fruit_popsicle', quantity: 1, unit: 'un', alternativeGroup: 'sobremesa' },
    ],
    fixedNotes: [
      'Incluir no prato: salada crua à vontade, no mínimo meio prato.',
      'Os legumes são 3 colheres de servir (150 g), cozidos no vapor.',
      'O azeite é 1 colher de chá (2 g).',
      'Sobremesa: escolha uma das quatro e lance a quantidade só dela — 20 g de chocolate, 1 paçoquinha, 20 g de doce de leite ou 1 picolé de fruta.',
    ],
  },
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
    id: 'meal1_option_01',
    mealId: 'meal_1',
    category: 'options',
    name: 'Pão + muçarela',
    ingredients: [
      { foodId: 'wholegrain_bread_18_grains', quantity: 2, unit: 'fatia' },
      { foodId: 'mozzarella_slice', quantity: 2, unit: 'fatia' },
      { foodId: 'fruit_portion', quantity: 1, unit: 'portion' },
    ],
    notes: ['Sugestão de pão: Wickbold 18 grãos — 66 g nas duas fatias.', '2 fatias de muçarela — 40 g.'],
  },
  {
    id: 'meal1_option_02',
    mealId: 'meal_1',
    category: 'options',
    name: 'Pão + ovos',
    ingredients: [
      { foodId: 'wholegrain_bread_18_grains', quantity: 2, unit: 'fatia' },
      { foodId: 'egg_whole', quantity: 2, unit: 'un' },
      { foodId: 'fruit_portion', quantity: 1, unit: 'portion' },
    ],
    notes: ['Sugestão de pão: Wickbold 18 grãos — 66 g nas duas fatias.', '2 unidades de ovo de galinha — 90 g.'],
  },
  {
    id: 'meal1_option_03',
    mealId: 'meal_1',
    category: 'options',
    name: 'Pão + muçarela + ovo',
    ingredients: [
      { foodId: 'wholegrain_bread_18_grains', quantity: 2, unit: 'fatia' },
      { foodId: 'mozzarella_slice', quantity: 1, unit: 'fatia' },
      { foodId: 'egg_whole', quantity: 1, unit: 'un' },
      { foodId: 'fruit_portion', quantity: 1, unit: 'portion' },
    ],
    notes: ['Sugestão de pão: Wickbold 18 grãos — 66 g nas duas fatias.', '1 fatia de muçarela (20 g) + 1 unidade de ovo (50 g).'],
  },

  // --- meal_2: Almoço ---------------------------------------------------
  {
    id: 'meal2_carb_01',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Arroz branco (4 colheres de servir)',
    ingredients: [{ foodId: 'rice_cooked', quantity: 180, unit: 'g' }],
  },
  {
    id: 'meal2_carb_02',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Arroz 7 grãos (4 colheres de servir)',
    ingredients: [{ foodId: 'seven_grain_rice_cooked', quantity: 210, unit: 'g' }],
  },
  {
    id: 'meal2_carb_03',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Arroz parboilizado (4 colheres de servir)',
    ingredients: [{ foodId: 'parboiled_rice_cooked', quantity: 180, unit: 'g' }],
  },
  {
    id: 'meal2_carb_04',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Arroz integral (4 colheres de servir)',
    ingredients: [{ foodId: 'brown_rice_cooked', quantity: 180, unit: 'g' }],
  },
  {
    id: 'meal2_carb_05',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Macarrão integral (4 pegadores)',
    ingredients: [{ foodId: 'wholegrain_pasta_cooked', quantity: 160, unit: 'g' }],
  },
  {
    id: 'meal2_carb_06',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Batata doce (2 xícaras)',
    ingredients: [{ foodId: 'sweet_potato_cooked', quantity: 300, unit: 'g' }],
  },
  {
    id: 'meal2_carb_07',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Batata baroa (mandioquinha) (2 xícaras)',
    ingredients: [{ foodId: 'mandioquinha_cooked', quantity: 300, unit: 'g' }],
  },
  {
    id: 'meal2_carb_08',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Batata inglesa (4 xícaras)',
    ingredients: [{ foodId: 'potato_cooked', quantity: 400, unit: 'g' }],
  },
  {
    id: 'meal2_carb_09',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Mandioca (2 xícaras)',
    ingredients: [{ foodId: 'cassava_cooked', quantity: 200, unit: 'g' }],
  },
  {
    id: 'meal2_carb_10',
    mealId: 'meal_2',
    category: 'carbohydrate',
    name: 'Quinoa (6 colheres de servir)',
    ingredients: [{ foodId: 'quinoa_cooked', quantity: 200, unit: 'g' }],
  },
  {
    id: 'meal2_legume_01',
    mealId: 'meal_2',
    category: 'legume',
    name: 'Ervilha fresca (6 colheres de sopa)',
    ingredients: [{ foodId: 'peas_cooked', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal2_legume_02',
    mealId: 'meal_2',
    category: 'legume',
    name: 'Feijão azuki (4 colheres de sopa)',
    ingredients: [{ foodId: 'azuki_beans_cooked', quantity: 90, unit: 'g' }],
  },
  {
    id: 'meal2_legume_03',
    mealId: 'meal_2',
    category: 'legume',
    name: 'Feijão fradinho (6 colheres de sopa)',
    ingredients: [{ foodId: 'black_eyed_peas_cooked', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal2_legume_04',
    mealId: 'meal_2',
    category: 'legume',
    name: 'Feijão preto (1 concha pequena)',
    ingredients: [{ foodId: 'black_beans_cooked', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal2_legume_05',
    mealId: 'meal_2',
    category: 'legume',
    name: 'Feijão carioca (1 concha pequena)',
    ingredients: [{ foodId: 'carioca_beans_cooked', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal2_legume_06',
    mealId: 'meal_2',
    category: 'legume',
    name: 'Feijão branco (3 colheres de sopa)',
    ingredients: [{ foodId: 'white_beans_cooked', quantity: 65, unit: 'g' }],
  },
  {
    id: 'meal2_legume_07',
    mealId: 'meal_2',
    category: 'legume',
    name: 'Lentilha (5 colheres de sopa)',
    ingredients: [{ foodId: 'lentils_cooked', quantity: 100, unit: 'g' }],
  },
  {
    id: 'meal2_legume_08',
    mealId: 'meal_2',
    category: 'legume',
    name: 'Grão de bico (3 colheres de sopa)',
    ingredients: [{ foodId: 'chickpeas_cooked', quantity: 60, unit: 'g' }],
  },
  {
    id: 'meal2_protein_01',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Alcatra grelhada (2 bifes médios)',
    ingredients: [{ foodId: 'beef_rump_grilled', quantity: 150, unit: 'g' }],
  },
  {
    id: 'meal2_protein_02',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Filé mignon grelhado (2 pedaços médios)',
    ingredients: [{ foodId: 'filet_mignon_grilled', quantity: 150, unit: 'g' }],
  },
  {
    id: 'meal2_protein_03',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Maminha grelhada (2 filés médios)',
    ingredients: [{ foodId: 'maminha_grilled', quantity: 190, unit: 'g' }],
  },
  {
    id: 'meal2_protein_04',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Patinho (2 filés médios)',
    ingredients: [{ foodId: 'ground_beef_patinho', quantity: 150, unit: 'g' }],
  },
  {
    id: 'meal2_protein_05',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Coxa de frango sem pele (2 unidades médias)',
    ingredients: [{ foodId: 'chicken_drumstick_skinless', quantity: 156, unit: 'g' }],
  },
  {
    id: 'meal2_protein_06',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Peito de frango grelhado sem pele (2 peitos médios)',
    ingredients: [{ foodId: 'chicken_breast_grilled', quantity: 190, unit: 'g' }],
  },
  {
    id: 'meal2_protein_07',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Coxa/sobrecoxa assada (1 unidade grande)',
    ingredients: [{ foodId: 'chicken_thigh_roasted_skinless_boneless', quantity: 150, unit: 'g' }],
  },
  {
    id: 'meal2_protein_08',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Lombo suíno assado (7 fatias finas)',
    ingredients: [{ foodId: 'pork_loin_cooked', quantity: 150, unit: 'g' }],
  },
  {
    id: 'meal2_protein_09',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Tilápia assada (2 filés grandes)',
    ingredients: [{ foodId: 'tilapia_grilled', quantity: 250, unit: 'g' }],
  },
  {
    id: 'meal2_protein_10',
    mealId: 'meal_2',
    category: 'protein',
    name: 'Salmão grelhado sem pele (2 pedaços médios)',
    ingredients: [{ foodId: 'salmon_grilled', quantity: 150, unit: 'g' }],
  },

  // --- meal_3: Lanche da tarde ------------------------------------------
  {
    id: 'meal3_option_01',
    mealId: 'meal_3',
    category: 'options',
    name: 'Pão + muçarela',
    ingredients: [
      { foodId: 'wholegrain_bread_18_grains', quantity: 2, unit: 'fatia' },
      { foodId: 'mozzarella_slice', quantity: 2, unit: 'fatia' },
      { foodId: 'fruit_portion', quantity: 2, unit: 'portion' },
    ],
    notes: ['Sugestão de pão: Wickbold 18 grãos — 66 g nas duas fatias.', '2 fatias de muçarela — 40 g.'],
  },
  {
    id: 'meal3_option_02',
    mealId: 'meal_3',
    category: 'options',
    name: 'Pão + ovos',
    ingredients: [
      { foodId: 'wholegrain_bread_18_grains', quantity: 2, unit: 'fatia' },
      { foodId: 'egg_whole', quantity: 2, unit: 'un' },
      { foodId: 'fruit_portion', quantity: 2, unit: 'portion' },
    ],
    notes: ['Sugestão de pão: Wickbold 18 grãos — 66 g nas duas fatias.', '2 unidades de ovo de galinha — 90 g.'],
  },
  {
    id: 'meal3_option_03',
    mealId: 'meal_3',
    category: 'options',
    name: 'Pão + muçarela + ovo',
    ingredients: [
      { foodId: 'wholegrain_bread_18_grains', quantity: 2, unit: 'fatia' },
      { foodId: 'mozzarella_slice', quantity: 1, unit: 'fatia' },
      { foodId: 'egg_whole', quantity: 1, unit: 'un' },
      { foodId: 'fruit_portion', quantity: 2, unit: 'portion' },
    ],
    notes: ['Sugestão de pão: Wickbold 18 grãos — 66 g nas duas fatias.', '1 fatia de muçarela (20 g) + 1 unidade de ovo (50 g).'],
  },
  {
    id: 'meal3_option_04',
    mealId: 'meal_3',
    category: 'options',
    name: 'Pastel de frango',
    ingredients: [
      { foodId: 'pastel_dough_disc', quantity: 1, unit: 'un' },
      { foodId: 'ricotta_cream_light', quantity: 10, unit: 'g' },
      { foodId: 'chicken_shredded', quantity: 40, unit: 'g' },
      { foodId: 'fruit_portion', quantity: 2, unit: 'portion' },
    ],
    notes: ['Frango desfiado ao molho.'],
  },
  {
    id: 'meal3_option_05',
    mealId: 'meal_3',
    category: 'options',
    name: 'Pão + patê de frango',
    ingredients: [
      { foodId: 'wholegrain_bread_18_grains', quantity: 2, unit: 'fatia' },
      { foodId: 'chicken_pate', quantity: 60, unit: 'g' },
      { foodId: 'fruit_portion', quantity: 2, unit: 'portion' },
    ],
    notes: ['Sugestão de pão: Wickbold 18 grãos — 66 g nas duas fatias.', '3 colheres de sopa de patê — 60 g.'],
  },

  // --- meal_4: Jantar ---------------------------------------------------
  {
    id: 'meal4_carb_01',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Arroz branco (3 colheres de servir)',
    ingredients: [{ foodId: 'rice_cooked', quantity: 135, unit: 'g' }],
  },
  {
    id: 'meal4_carb_02',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Arroz 7 grãos (3 colheres de servir)',
    ingredients: [{ foodId: 'seven_grain_rice_cooked', quantity: 155, unit: 'g' }],
  },
  {
    id: 'meal4_carb_03',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Arroz parboilizado (3 colheres de servir)',
    ingredients: [{ foodId: 'parboiled_rice_cooked', quantity: 135, unit: 'g' }],
  },
  {
    id: 'meal4_carb_04',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Arroz integral (3 colheres de servir)',
    ingredients: [{ foodId: 'brown_rice_cooked', quantity: 135, unit: 'g' }],
  },
  {
    id: 'meal4_carb_05',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Macarrão integral (3 pegadores)',
    ingredients: [{ foodId: 'wholegrain_pasta_cooked', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal4_carb_06',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Batata doce (1 e ½ xícara)',
    ingredients: [{ foodId: 'sweet_potato_cooked', quantity: 225, unit: 'g' }],
  },
  {
    id: 'meal4_carb_07',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Batata baroa (mandioquinha) (1 e ½ xícara)',
    ingredients: [{ foodId: 'mandioquinha_cooked', quantity: 225, unit: 'g' }],
  },
  {
    id: 'meal4_carb_08',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Batata inglesa (3 xícaras)',
    ingredients: [{ foodId: 'potato_cooked', quantity: 300, unit: 'g' }],
  },
  {
    id: 'meal4_carb_09',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Mandioca (1 e ½ xícara)',
    ingredients: [{ foodId: 'cassava_cooked', quantity: 150, unit: 'g' }],
  },
  {
    id: 'meal4_carb_10',
    mealId: 'meal_4',
    category: 'carbohydrate',
    name: 'Quinoa (9 colheres de sopa)',
    ingredients: [{ foodId: 'quinoa_cooked', quantity: 150, unit: 'g' }],
  },
  {
    id: 'meal4_protein_01',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Alcatra grelhada (2 bifes pequenos)',
    ingredients: [{ foodId: 'beef_rump_grilled', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal4_protein_02',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Filé mignon grelhado (2 pedaços pequenos)',
    ingredients: [{ foodId: 'filet_mignon_grilled', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal4_protein_03',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Maminha grelhada (2 filés pequenos)',
    ingredients: [{ foodId: 'maminha_grilled', quantity: 160, unit: 'g' }],
  },
  {
    id: 'meal4_protein_04',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Patinho (2 filés pequenos)',
    ingredients: [{ foodId: 'ground_beef_patinho', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal4_protein_05',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Coxa de frango sem pele (2 unidades pequenas)',
    ingredients: [{ foodId: 'chicken_drumstick_skinless', quantity: 126, unit: 'g' }],
  },
  {
    id: 'meal4_protein_06',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Peito de frango grelhado sem pele (2 peitos pequenos)',
    ingredients: [{ foodId: 'chicken_breast_grilled', quantity: 160, unit: 'g' }],
  },
  {
    id: 'meal4_protein_07',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Coxa/sobrecoxa assada (1 unidade grande)',
    ingredients: [{ foodId: 'chicken_thigh_roasted_skinless_boneless', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal4_protein_08',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Lombo suíno assado (6 fatias finas)',
    ingredients: [{ foodId: 'pork_loin_cooked', quantity: 120, unit: 'g' }],
  },
  {
    id: 'meal4_protein_09',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Tilápia assada (2 filés grandes)',
    ingredients: [{ foodId: 'tilapia_grilled', quantity: 220, unit: 'g' }],
  },
  {
    id: 'meal4_protein_10',
    mealId: 'meal_4',
    category: 'protein',
    name: 'Salmão grelhado sem pele (2 pedaços médios)',
    ingredients: [{ foodId: 'salmon_grilled', quantity: 120, unit: 'g' }],
  },
]

/**
 * Grupo A da prescrição (p. 14): consumo à vontade. Só para exibição na tela de
 * registro — sem rastreamento de nutrição.
 */
export const VEGETABLES_UNLIMITED: string[] = [
  'Abobrinha italiana crua', 'Acelga', 'Agrião', 'Aipo (salsão)', 'Alface',
  'Almeirão', 'Aspargo', 'Broto de feijão', 'Cenoura crua ralada', 'Chicória',
  'Chuchu cozido', 'Couve manteiga crua', 'Escarola', 'Espinafre cru',
  'Molho de tomate caseiro', 'Pepino', 'Purê de tomate', 'Rabanete',
  'Repolho branco e roxo', 'Rúcula', 'Taioba', 'Tomate',
]

/**
 * Grupo B da prescrição (p. 15): entram na quantidade que o plano manda, e é
 * deles que sai o `cooked_vegetables_mix` das 3 colheres de servir do prato.
 */
export const VEGETABLES_BY_PLAN: string[] = [
  'Abóbora cabotiá cozida', 'Abóbora moranga cozida', 'Abóbora de pescoço cozida',
  'Berinjela cozida', 'Beterraba cozida', 'Brócolis cozido', 'Cenoura cozida',
  'Cogumelos refogados (champignon, paris, shimeji)', 'Couve-flor cozida',
  'Espinafre refogado', 'Funghi', 'Jiló cozido', 'Palmito juçara em conserva',
  'Palmito pupunha em conserva', 'Quiabo', 'Vagem cozida',
]

/**
 * Semeia o catálogo de dieta (alimentos, refeições e opções do plano) na
 * primeira execução. Mesmo raciocínio do `ensureHydrationCatalog`: a tabela
 * nasce vazia e, numa instalação nova, o `.upgrade()` do Dexie nunca roda —
 * sem isto a seção Nutrição da aba Saúde abriria sem nada em que tocar.
 *
 * Os alimentos, porém, são conferidos em toda abertura e não só na primeira:
 * o catálogo cresce entre versões do app, e quem já tem o banco criado nunca
 * veria os novos se a função parasse na primeira linha. Entra só o que falta,
 * por id — nada do que já está gravado é sobrescrito, para um valor ajustado
 * não voltar ao padrão no deploy seguinte. As refeições e as opções continuam
 * presas à primeira execução: são o plano da dieta, e reinserir uma opção
 * apagada seria desfazer uma escolha do usuário. Trocar de dieta, por isso, é
 * a `version(7)` do Dexie esvaziar as duas tabelas — daí esta função volta a
 * enxergá-las vazias e semeia o plano novo.
 */
export async function ensureDietCatalog(): Promise<void> {
  const now = Date.now()

  await addMissingFoods(now)

  if ((await db.dietMeals.count()) > 0) return

  const meals: DietMeal[] = SEED_MEALS.map((seed, i) => ({
    id: seed.id,
    name: seed.name,
    order: i,
    selectionMode: seed.selectionMode,
    selectionRules: seed.selectionRules,
    optionalSides: seed.optionalSides,
    fixedIngredients: seed.fixedIngredients,
    fixedNotes: seed.fixedNotes,
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

  await db.dietMeals.bulkAdd(meals)
  await db.dietOptions.bulkAdd(options)
}

/**
 * Insere os alimentos do seed que ainda não existem no banco. O `order` dos
 * novos continua de onde o catálogo gravado parou, em vez de vir da posição
 * na lista: assim dá para agrupar alimento novo junto dos parecidos no código
 * sem renumerar o que já está salvo.
 */
async function addMissingFoods(now: number): Promise<void> {
  const existing = await db.foods.toArray()
  const existingIds = new Set(existing.map((food) => food.id))
  const missing = ALL_FOODS.filter((seed) => !existingIds.has(seed.id))
  if (missing.length === 0) return

  const firstOrder = existing.reduce((max, food) => Math.max(max, food.order + 1), 0)

  const foods: Food[] = missing.map((seed, i) => ({
    id: seed.id,
    name: seed.name,
    baseUnit: seed.baseUnit,
    caloriesPerBaseUnit: seed.calories,
    proteinPerBaseUnit: seed.protein,
    carbsPerBaseUnit: seed.carbs,
    fatPerBaseUnit: seed.fat,
    nutritionEstimated: seed.estimated,
    order: firstOrder + i,
    archived: 0,
    createdAt: now + i,
  }))

  await db.foods.bulkAdd(foods)
}
