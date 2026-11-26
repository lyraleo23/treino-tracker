import type { Character } from '../characters'
import { toLevels, type Observation, type Sheet } from './sheet'

/**
 * GTA VI — cargas do levantamento "GTA VI — Exercícios e pesos encontrados",
 * versão 8 (nov/2026), tiradas das capturas do jogo. Os valores ficam em kg
 * exatamente como aparecem na tela (114,4; 154,4...), sem arredondar.
 *
 * As cargas do menu de cada exercício SÃO os Strength Levels: a mais leve é a
 * Força 1, a seguinte a Força 2, e assim por diante (confirmado pelo
 * levantamento). O que importa é o peso: atual ou bloqueado é só o estado da
 * carga no jogo, para quem jogava naquele momento, e não entra aqui.
 *
 * Só entra o que está Confirmado nas capturas. O que ainda está Pendente fica
 * anotado nos comentários e fora da Arena.
 */

/**
 * Kettlebell: a mesma lista para Jason e Lucia, e para qualquer variação com
 * kettlebell que aparecer (regra do levantamento). São três pesos, não
 * quatro: entram como Força 1 a 3, e a Força 4 fica sem kettlebell.
 */
const KETTLEBELL: Observation = {
  game: 'Kettlebell Swings',
  kg: [12, 18, 24],
  status: 'confirmado',
  note: 'Valores compartilhados entre os personagens.',
}

/**
 * Jason. A atribuição das capturas é provável — visualmente compatível com
 * ele — até confirmação explícita.
 */
const JASON: Sheet = {
  supino: {
    game: 'Bench Press',
    kg: [60, 80, 100, 140],
    status: 'confirmado',
  },
  crucifixo: {
    game: 'Chest Flys',
    kg: [70, 85, 100, 115],
    status: 'confirmado',
  },
  crossover: {
    game: 'Cable Crossovers',
    kg: [30, 40, 50, 60],
    status: 'confirmado',
  },
  agachamento: {
    game: 'Squats',
    kg: [100, 114.4, 140, 154.4],
    status: 'confirmado',
  },
  terra: {
    game: 'Deadlifts',
    kg: [114.4, 134.4, 160, 184.4],
    status: 'confirmado',
  },
  'leg-press': {
    game: 'Leg Press',
    kg: [160, 200, 230, 280],
    status: 'confirmado',
  },
  puxada: {
    game: 'Lat Pulldowns',
    kg: [60, 70, 80, 90],
    status: 'confirmado',
  },
  'desenvolvimento-halteres': {
    game: 'Shoulder Press',
    kg: [22.6, 29.4, 36.2, 43],
    status: 'confirmado',
    note: 'Confirmar se é o mesmo exercício que Dumbbell Shoulder Press.',
  },
  'rosca-halteres': {
    game: 'Dumbbell Curls',
    kg: [15.8, 18.1, 20.4, 29.4],
    status: 'confirmado',
  },
  kettlebell: KETTLEBELL,
  // Pendentes: Pull-Ups e Dips (peso corporal), Leg Extensions, EZ Bar Curls,
  // Treadmill e Exercise Bike.
}

const LUCIA: Sheet = {
  supino: {
    game: 'Bench Press',
    kg: [30, 40, 54.4, 70],
    status: 'confirmado',
  },
  agachamento: {
    game: 'Squats',
    kg: [40, 54.4, 74.4, 90],
    status: 'confirmado',
  },
  terra: {
    game: 'Deadlifts',
    kg: [60, 80, 90, 110],
    status: 'confirmado',
  },
  'leg-press': {
    game: 'Leg Press',
    kg: [60, 100, 134.4, 174.4],
    status: 'confirmado',
  },
  puxada: {
    game: 'Lat Pulldowns',
    kg: [25, 35, 45, 55],
    status: 'confirmado',
  },
  crucifixo: {
    game: 'Chest Flys',
    kg: [20, 30, 40, 50],
    status: 'confirmado',
  },
  crossover: {
    game: 'Cable Crossovers',
    kg: [10, 20, 30, 40],
    status: 'confirmado',
  },
  'rosca-halteres': {
    game: 'Dumbbell Curls',
    kg: [6.8, 9, 11.3, 13.6],
    status: 'associacao-provavel',
    note: 'Seleção de peso junto ao rack de halteres, sem o nome do exercício legível.',
  },
  'desenvolvimento-halteres': {
    game: 'Dumbbell Shoulder Press',
    kg: [6.8, 11.3, 15.8, 20.4],
    status: 'associacao-provavel',
    note: 'Seleção de peso junto ao rack de halteres, sem o nome do exercício legível.',
  },
  kettlebell: KETTLEBELL,
  // Pendentes: EZ Bar Curls e Leg Extensions.
}

export const GTA6_CHARACTERS: Character[] = [
  {
    id: 'gta6-lucia',
    name: 'Lucia Caminos',
    game: 'GTA VI',
    feat: 'Treina na Ajax Gym, em Vice City.',
    provisional: true,
    levelLabel: 'Força',
    levels: toLevels(LUCIA),
  },
  {
    id: 'gta6-jason',
    name: 'Jason Duval',
    game: 'GTA VI',
    feat: 'Treina na varanda de casa, em Key Lento.',
    provisional: true,
    levelLabel: 'Força',
    levels: toLevels(JASON),
  },
]
