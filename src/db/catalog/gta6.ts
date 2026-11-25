import type { Character, CharacterLevel, ProvaId } from '../characters'

/**
 * GTA VI — cargas do levantamento "GTA VI — Exercícios e pesos encontrados",
 * versão 5 (nov/2026), tiradas das capturas do jogo. Os valores ficam em kg
 * exatamente como aparecem na tela (114,4; 154,4...), sem arredondar.
 *
 * Regras do levantamento que valem aqui:
 * - Só entra o que está Confirmado nas capturas. O que ainda está Pendente
 *   fica anotado nos comentários e fora da Arena.
 * - Carga bloqueada continua sendo carga da progressão: fica indisponível só
 *   enquanto o personagem não tem Strength suficiente. Por isso a referência
 *   da Arena é a maior carga exibida, bloqueada ou não.
 * - Nada de associar carga a Strength Level sem validar no jogo.
 *
 * Duas camadas:
 * - `JASON` / `LUCIA`: a referência sem nível, com tudo o que foi exibido.
 *   É o que a Arena usa enquanto nenhum nível tiver carga.
 * - `JASON_LEVELS` / `LUCIA_LEVELS`: a carga de cada Strength Level (1 a 4),
 *   a preencher quando o mapeamento for validado. Basta UM nível com carga
 *   para o personagem passar a disputar por níveis — e a referência sai da
 *   Arena. Nível sem carga numa prova só não disputa ela.
 */

/** O status da informação no levantamento. */
type Status =
  /** Exercício e carga aparecem claramente na captura. */
  | 'confirmado'
  /** Carga clara, mas o nome do exercício não aparece legível na captura. */
  | 'associacao-provavel'

interface Observation {
  /** Todas as cargas exibidas no menu, em kg, da mais leve à mais pesada. */
  kg: number[]
  /** A marcada como CURRENT na captura. */
  current?: number
  /** As que aparecem com cadeado. */
  locked?: number[]
  status: Status
  /** Exercício como o jogo chama, para conferir com o levantamento. */
  game: string
  note?: string
  /** Força outra carga para a Arena. Ausente, vale a maior de `kg`. */
  arena?: number
}

type Sheet = Partial<Record<ProvaId, Observation>>

/** A carga de um nível, quando o mapeamento existir: um número por exercício. */
interface LevelObservation {
  kg: number
  status: Status
  note?: string
}

type LevelSheet = Partial<Record<ProvaId, LevelObservation>>
type Levels = Record<1 | 2 | 3 | 4, LevelSheet>

/**
 * Jason. A atribuição das capturas é provável — visualmente compatível com
 * ele — até confirmação explícita.
 */
const JASON: Sheet = {
  supino: {
    game: 'Bench Press',
    kg: [60, 80, 100, 140],
    current: 100,
    locked: [140],
    status: 'confirmado',
    note: '100 CURRENT numa captura; 140 bloqueado em outra.',
  },
  crucifixo: {
    game: 'Chest Flys',
    kg: [70, 85, 100, 115],
    current: 100,
    locked: [115],
    status: 'confirmado',
  },
  crossover: {
    game: 'Cable Crossovers',
    kg: [30, 40, 50, 60],
    current: 50,
    locked: [60],
    status: 'confirmado',
  },
  agachamento: {
    game: 'Squats',
    kg: [100, 114.4, 140, 154.4],
    current: 140,
    locked: [154.4],
    status: 'confirmado',
  },
  'leg-press': {
    game: 'Leg Press',
    kg: [160, 200, 230, 280],
    current: 230,
    locked: [280],
    status: 'confirmado',
  },
  puxada: {
    game: 'Lat Pulldowns',
    kg: [70, 84, 98, 112],
    current: 98,
    locked: [112],
    status: 'confirmado',
  },
  'desenvolvimento-halteres': {
    game: 'Shoulder Press',
    kg: [22.6, 29.4, 36.2, 43],
    current: 36.2,
    locked: [43],
    status: 'confirmado',
    note:
      'Confirmar se é o mesmo exercício que Dumbbell Shoulder Press. O 36,2 CURRENT ' +
      'bate com os 80 lb por braço do primeiro levantamento.',
  },
  'rosca-halteres': {
    game: 'Dumbbell Curls',
    kg: [15.8, 18.1, 20.4, 29.4],
    current: 20.4,
    locked: [29.4],
    status: 'confirmado',
  },
  kettlebell: {
    game: 'Kettlebell Swings',
    kg: [12, 18, 24],
    status: 'confirmado',
    note: 'Três pesos exibidos.',
  },
  // Pendentes: Deadlifts (cargas antigas sem confirmação visual), Pull-Ups e
  // Dips (peso corporal), Leg Extensions, EZ Bar Curls, Treadmill e Exercise
  // Bike.
}

const LUCIA: Sheet = {
  supino: {
    game: 'Bench Press',
    kg: [30, 40, 54.4, 70],
    current: 70,
    status: 'confirmado',
  },
  agachamento: {
    game: 'Squats',
    kg: [40, 54.4, 74.4, 90],
    current: 90,
    status: 'confirmado',
  },
  crucifixo: {
    game: 'Chest Flys',
    kg: [20, 30, 40, 50],
    current: 50,
    status: 'confirmado',
  },
  crossover: {
    game: 'Cable Crossovers',
    kg: [10, 20, 30, 40],
    current: 40,
    status: 'confirmado',
  },
  'rosca-halteres': {
    game: 'Dumbbell Curls',
    kg: [6.8, 9, 11.3, 13.6],
    current: 13.6,
    status: 'associacao-provavel',
    note: 'Seleção de peso junto ao rack de halteres, sem o nome do exercício legível.',
  },
  'desenvolvimento-halteres': {
    game: 'Dumbbell Shoulder Press',
    kg: [6.8, 11.3, 15.8, 20.4],
    current: 20.4,
    status: 'associacao-provavel',
    note: 'Seleção de peso junto ao rack de halteres, sem o nome do exercício legível.',
  },
  // Pendentes: Lat Pulldowns (110 / 130 lb do primeiro levantamento, sem
  // confirmação visual), Deadlifts, EZ Bar Curls e Leg Extensions.
}

// Exemplo de preenchimento, quando o mapeamento for validado no jogo:
//   2: { supino: { kg: 80, status: 'confirmado' } },
const JASON_LEVELS: Levels = { 1: {}, 2: {}, 3: {}, 4: {} }

const LUCIA_LEVELS: Levels = { 1: {}, 2: {}, 3: {}, 4: {} }

function toLoads(sheet: Sheet): CharacterLevel['loads'] {
  const loads: CharacterLevel['loads'] = {}
  for (const [prova, observation] of Object.entries(sheet) as [ProvaId, Observation][]) {
    loads[prova] = observation.arena ?? Math.max(...observation.kg)
  }
  return loads
}

function toLevels(levels: Levels): CharacterLevel[] {
  return Object.entries(levels).map(([level, sheet]) => {
    const loads: CharacterLevel['loads'] = {}
    for (const [prova, observation] of Object.entries(sheet) as [
      ProvaId,
      LevelObservation,
    ][]) {
      loads[prova] = observation.kg
    }
    return { level: Number(level), loads }
  })
}

export const GTA6_CHARACTERS: Character[] = [
  {
    id: 'gta6-lucia',
    name: 'Lucia Caminos',
    game: 'GTA VI',
    feat: 'Treina na Ajax Gym, em Vice City.',
    provisional: true,
    levelLabel: 'Força',
    levels: toLevels(LUCIA_LEVELS),
    loads: toLoads(LUCIA),
  },
  {
    id: 'gta6-jason',
    name: 'Jason Duval',
    game: 'GTA VI',
    feat: 'Treina na varanda de casa, em Key Lento.',
    provisional: true,
    levelLabel: 'Força',
    levels: toLevels(JASON_LEVELS),
    loads: toLoads(JASON),
  },
]
