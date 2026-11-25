import type { Character, CharacterLevel, ProvaId } from '../characters'

/**
 * GTA VI — cargas do levantamento "GTA VI — Exercícios e pesos encontrados",
 * versão 5 (nov/2026), tiradas das capturas do jogo. Os valores ficam em kg
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

/** O status da informação no levantamento. */
type Status =
  /** Exercício e carga aparecem claramente na captura. */
  | 'confirmado'
  /** Carga clara, mas o nome do exercício não aparece legível na captura. */
  | 'associacao-provavel'

interface Observation {
  /**
   * As cargas do menu, em kg, da mais leve à mais pesada: a posição é o nível
   * (a 1ª é a Força 1). Com menos cargas que níveis, os níveis de cima ficam
   * sem esta prova.
   */
  kg: number[]
  status: Status
  /** Exercício como o jogo chama, para conferir com o levantamento. */
  game: string
  note?: string
}

type Sheet = Partial<Record<ProvaId, Observation>>

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
  'leg-press': {
    game: 'Leg Press',
    kg: [160, 200, 230, 280],
    status: 'confirmado',
  },
  puxada: {
    game: 'Lat Pulldowns',
    kg: [70, 84, 98, 112],
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
  kettlebell: {
    game: 'Kettlebell Swings',
    kg: [12, 18, 24],
    status: 'confirmado',
    note:
      'Três pesos exibidos, não quatro: entram como Força 1 a 3, e a Força 4 fica ' +
      'sem kettlebell até o levantamento confirmar.',
  },
  // Pendentes: Deadlifts (cargas antigas sem confirmação visual), Pull-Ups e
  // Dips (peso corporal), Leg Extensions, EZ Bar Curls, Treadmill e Exercise
  // Bike.
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
  // Pendentes: Lat Pulldowns (110 / 130 lb do primeiro levantamento, sem
  // confirmação visual), Deadlifts, EZ Bar Curls e Leg Extensions.
}

/** Um nível por posição na lista de cargas: a 1ª carga é a Força 1. */
function toLevels(sheet: Sheet): CharacterLevel[] {
  const levels: CharacterLevel[] = []
  for (const [prova, observation] of Object.entries(sheet) as [ProvaId, Observation][]) {
    const ordered = [...observation.kg].sort((a, b) => a - b)
    ordered.forEach((kg, index) => {
      levels[index] ??= { level: index + 1, loads: {} }
      levels[index].loads[prova] = kg
    })
  }
  return levels
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
