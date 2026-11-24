import type { Character, CharacterLevel, ProvaId } from '../characters'

/**
 * GTA VI — cargas observadas no jogo, tiradas do levantamento "GTA VI —
 * Exercícios e pesos encontrados" (versão inicial, nov/2026). Os valores ficam
 * em libras, como aparecem na tela; a conversão para kg acontece só na hora de
 * montar o personagem.
 *
 * Duas camadas:
 * - `JASON` / `LUCIA`: a referência sem nível, com tudo o que já foi visto.
 *   É o que a Arena usa enquanto nenhum nível tiver carga.
 * - `JASON_LEVELS` / `LUCIA_LEVELS`: a carga de cada Strength Level (1 a 4),
 *   a preencher conforme o levantamento separar os níveis. Basta UM nível
 *   com carga para o personagem passar a disputar por níveis — e a
 *   referência sai da Arena. Nível sem carga numa prova só não disputa ela.
 *
 * Não preencha nível por suposição: só com a carga vista naquele nível.
 */

/** O critério de confiabilidade do levantamento. */
type Confidence =
  /** Personagem e carga aparecem claramente em gameplay ou captura. */
  | 'confirmado'
  /** A carga aparece, mas não dá para atribuí-la com segurança ao personagem. */
  | 'personagem-incerto'

interface Observation {
  /** Todas as cargas vistas para o personagem neste exercício, em lb. */
  lbs: number[]
  /**
   * A carga que a Arena usa, em lb. Por enquanto a maior observada — é o
   * número a corrigir quando a revisão separar cargas liberadas, atual e
   * bloqueadas.
   */
  arena: number
  confidence: Confidence
  note?: string
}

type Sheet = Partial<Record<ProvaId, Observation>>

/** A carga vista num nível: um número por exercício. */
interface LevelObservation {
  /** Em lb, como aparece na tela. */
  lbs: number
  confidence: Confidence
  note?: string
}

type LevelSheet = Partial<Record<ProvaId, LevelObservation>>
type Levels = Record<1 | 2 | 3 | 4, LevelSheet>

const JASON: Sheet = {
  supino: {
    lbs: [135, 185, 225, 315],
    arena: 315,
    confidence: 'confirmado',
    note: '225 e 315 também aparecem bloqueados em outra captura.',
  },
  agachamento: {
    lbs: [225, 255, 315, 355],
    arena: 355,
    confidence: 'confirmado',
    note: 'Registros de situações de jogo diferentes.',
  },
  terra: {
    lbs: [255, 305, 365, 415],
    arena: 415,
    confidence: 'confirmado',
    note: '365 e 415 aparecem bloqueados em uma captura.',
  },
  kettlebell: {
    lbs: [35, 62],
    arena: 62,
    confidence: 'confirmado',
    note: 'Equipamento da casa.',
  },
  puxada: {
    lbs: [160],
    arena: 160,
    confidence: 'personagem-incerto',
    note: 'Gameplay atribuído ao Jason; a captura da máquina não mostra quem.',
  },
  'leg-press': {
    lbs: [450, 520],
    arena: 520,
    confidence: 'personagem-incerto',
    note: 'Confirmar o personagem e se as duas opções são selecionáveis.',
  },
  'desenvolvimento-halteres': {
    lbs: [80],
    arena: 80,
    confidence: 'personagem-incerto',
    note: 'Por braço. Confirmar o personagem e se o valor é por halter.',
  },
  // Barra fixa e paralelas: peso corporal, sem carga — a Arena só compara
  // carga e tempo por enquanto.
}

const LUCIA: Sheet = {
  puxada: {
    lbs: [110, 130],
    arena: 130,
    confidence: 'confirmado',
    note: '130 aparece como carga atual (CURRENT); 110 também é opção.',
  },
  // Supino: só anilhas de 25 lb por lado numa imagem, sem o peso total da
  // barra — não é carga máxima e fica de fora.
  // Terra, agachamento, cadeira extensora e rosca com barra EZ: ela aparece
  // fazendo, mas sem carga legível.
}

// Exemplo de preenchimento, quando a carga do nível for vista no jogo:
//   2: { supino: { lbs: 185, confidence: 'confirmado' } },
const JASON_LEVELS: Levels = { 1: {}, 2: {}, 3: {}, 4: {} }

const LUCIA_LEVELS: Levels = { 1: {}, 2: {}, 3: {}, 4: {} }

/**
 * Cargas vistas em menus de máquina da Vice Seven Gym, sem personagem. Ficam
 * registradas para a revisão, mas não entram em ninguém.
 */
export const GTA6_UNASSIGNED = {
  crossover: { available: [60, 80], locked: [100, 120] },
  crucifixo: { available: [140, 170], locked: [200, 230] },
} as const

const LB_TO_KG = 0.45359237

function lbToKg(lbs: number): number {
  return Math.round(lbs * LB_TO_KG * 10) / 10
}

function toLoads(sheet: Sheet): CharacterLevel['loads'] {
  const loads: CharacterLevel['loads'] = {}
  for (const [prova, observation] of Object.entries(sheet) as [ProvaId, Observation][]) {
    loads[prova] = lbToKg(observation.arena)
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
      loads[prova] = lbToKg(observation.lbs)
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
    feat: 'Supino, agachamento e terra na varanda de casa, em Key Lento.',
    provisional: true,
    levelLabel: 'Força',
    levels: toLevels(JASON_LEVELS),
    loads: toLoads(JASON),
  },
]
