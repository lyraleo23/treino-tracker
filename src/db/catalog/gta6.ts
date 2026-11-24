import type { Character, ProvaId } from '../characters'

/**
 * GTA VI — cargas observadas no jogo, tiradas do levantamento "GTA VI —
 * Exercícios e pesos encontrados" (versão inicial, nov/2026). Os valores ficam
 * em libras, como aparecem na tela; a conversão para kg acontece só na hora de
 * montar o personagem.
 *
 * Ainda em revisão. Em especial: NÃO há correspondência comprovada entre estas
 * cargas e os Strength Levels 1–4, então cada protagonista é um personagem só,
 * sem nível. Quando o mapa de níveis existir, cada nível vira um personagem
 * ("Jason · Força 2") e a escada da Arena ganha degraus.
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

/**
 * Cargas vistas em menus de máquina da Vice Seven Gym, sem personagem. Ficam
 * registradas para a revisão, mas não entram em ninguém.
 */
export const GTA6_UNASSIGNED = {
  crossover: { available: [60, 80], locked: [100, 120] },
  crucifixo: { available: [140, 170], locked: [200, 230] },
} as const

const LB_TO_KG = 0.45359237

function toLoads(sheet: Sheet): Character['loads'] {
  const loads: Character['loads'] = {}
  for (const [prova, observation] of Object.entries(sheet) as [ProvaId, Observation][]) {
    loads[prova] = Math.round(observation.arena * LB_TO_KG * 10) / 10
  }
  return loads
}

export const GTA6_CHARACTERS: Character[] = [
  {
    id: 'gta6-lucia',
    name: 'Lucia Caminos',
    game: 'GTA VI',
    feat: 'Treina na Ajax Gym, em Vice City.',
    provisional: true,
    loads: toLoads(LUCIA),
  },
  {
    id: 'gta6-jason',
    name: 'Jason Duval',
    game: 'GTA VI',
    feat: 'Supino, agachamento e terra na varanda de casa, em Key Lento.',
    provisional: true,
    loads: toLoads(JASON),
  },
]
