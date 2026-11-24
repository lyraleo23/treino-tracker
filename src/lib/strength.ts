import type { Character, ProvaId, ProvaUnit } from '../db/characters'
import { formatNumber, formatSeconds } from './format'

/**
 * Como a sua força vira um número comparável com o do personagem.
 *
 * - `e1rm`: carga máxima estimada numa repetição (Epley: peso × (1 + reps/30)).
 *   O app treina em faixas de 8 a 12; 40 kg × 10 equivale a uns 53 kg numa só,
 *   e é com isso que o "aguenta X kg" do personagem se compara de forma justa.
 * - `maxWeight`: o maior peso levantado, quantas vezes for — o mesmo número do
 *   "Recorde" na tela do exercício. Mais simples, mas joga contra quem treina
 *   com repetições altas.
 */
export type StrengthMetric = 'e1rm' | 'maxWeight'

/** A métrica em uso. A outra fica pronta: trocar aqui troca o app inteiro. */
export const STRENGTH_METRIC: StrengthMetric = 'e1rm'

/**
 * Só as séries dos últimos 90 dias contam. Parou de treinar, a marca cai e o
 * personagem pode voltar a ficar na frente — a Arena mede a forma de agora.
 */
export const STRENGTH_WINDOW_DAYS = 90

/** Acima disso a estimativa de Epley exagera; a série fica fora do e1rm. */
export const MAX_REPS_FOR_ESTIMATE = 12

/**
 * Provas em comum para a média valer. Com uma só, um exercício forte decidiria
 * sozinho quem você é. Personagem que só tem uma prova no catálogo é comparado
 * por ela mesma — senão nunca entraria na disputa.
 */
export const MIN_SHARED_PROVAS = 2

/**
 * Teto de cada prova na média: 150%. Sem ele, um supino muito acima do
 * personagem esconderia três provas abaixo dele.
 */
export const RATIO_CAP = 1.5

const DAY_MS = 24 * 60 * 60 * 1000

export function strengthWindowStart(now = Date.now()): number {
  return now - STRENGTH_WINDOW_DAYS * DAY_MS
}

/**
 * Arredonda em centésimos: 60 × (1 + 10/30) dá 79,999999… em ponto flutuante,
 * e quem fez exatamente a meta de 60 kg × 10 precisa empatar com os 80 kg.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  const value = reps <= 1 ? weight : weight * (1 + reps / 30)
  return Math.round(value * 100) / 100
}

/**
 * Quanto uma série vale na prova, ou `undefined` se ela não diz nada sobre
 * força máxima (sem peso, sem repetições, repetições demais para estimar).
 */
export function setStrength(
  log: { weight?: number; reps?: number; seconds?: number },
  unit: ProvaUnit,
  metric: StrengthMetric = STRENGTH_METRIC,
): number | undefined {
  if (unit === 's') return log.seconds && log.seconds > 0 ? log.seconds : undefined

  const { weight, reps } = log
  if (!weight || weight <= 0 || !reps || reps <= 0) return undefined
  if (metric === 'maxWeight') return weight
  if (reps > MAX_REPS_FOR_ESTIMATE) return undefined
  return estimateOneRepMax(weight, reps)
}

/** Repetições usadas na meta: as do alvo, até onde a estimativa ainda vale. */
export function goalReps(reps: number): number {
  return Math.max(1, Math.min(reps, MAX_REPS_FOR_ESTIMATE))
}

/**
 * A carga que, feita em `reps` repetições, alcança `target`. Arredondada para
 * cima no passo do aparelho: a meta precisa ser uma carga que existe.
 */
export function loadToReach(
  target: number,
  reps: number,
  step: number,
  metric: StrengthMetric = STRENGTH_METRIC,
): number {
  const effectiveReps = goalReps(reps)
  const exact =
    metric === 'maxWeight' || effectiveReps <= 1 ? target : target / (1 + effectiveReps / 30)
  // O epsilon evita que 55 / 2,5 = 22,0000001 suba um passo à toa.
  return Math.ceil(exact / step - 1e-9) * step
}

export function loadOf(character: Character, prova: ProvaId): number | undefined {
  return character.loads[prova]
}

/** A escada de uma prova, do personagem mais fraco ao mais forte. */
export interface Duel {
  /** O mais fraco entre os que ainda estão na sua frente. */
  rival?: Character
  /** Os que você já alcançou (empatar conta), do mais fraco ao mais forte. */
  beaten: Character[]
  /** Os que estão na frente, do mais fraco ao mais forte. */
  ahead: Character[]
}

export function duelFor(
  prova: ProvaId,
  value: number | undefined,
  characters: Character[],
): Duel {
  const contenders = characters
    .filter((character) => loadOf(character, prova) !== undefined)
    .sort((a, b) => loadOf(a, prova)! - loadOf(b, prova)!)

  const beaten =
    value === undefined ? [] : contenders.filter((c) => loadOf(c, prova)! <= value)
  const ahead = contenders.filter((c) => !beaten.includes(c))
  return { rival: ahead[0], beaten, ahead }
}

export interface ProvaComparison {
  prova: ProvaId
  yours: number
  theirs: number
  /** Sua marca ÷ a dele, já com o teto de RATIO_CAP. */
  ratio: number
}

export interface CharacterResult {
  character: Character
  /** As provas que vocês dois têm. */
  shared: ProvaComparison[]
  /** Média das razões; ausente quando faltam provas em comum. */
  ratio?: number
}

export interface Standing {
  /** Os comparáveis, do mais forte (menor razão) ao mais fraco. */
  ranked: CharacterResult[]
  /** Sem provas em comum suficientes. */
  unranked: CharacterResult[]
  /** "Você é": o mais forte que você alcança na média. */
  you?: CharacterResult
  /** O que está mais perto, logo na frente. */
  next?: CharacterResult
}

export function compareWith(
  character: Character,
  marks: Partial<Record<ProvaId, number>>,
): CharacterResult {
  const shared: ProvaComparison[] = []
  for (const [prova, theirs] of Object.entries(character.loads) as [ProvaId, number][]) {
    const yours = marks[prova]
    if (yours === undefined || !(theirs > 0)) continue
    shared.push({ prova, yours, theirs, ratio: Math.min(yours / theirs, RATIO_CAP) })
  }

  const needed = Math.max(1, Math.min(MIN_SHARED_PROVAS, Object.keys(character.loads).length))
  const ratio =
    shared.length >= needed
      ? shared.reduce((sum, item) => sum + item.ratio, 0) / shared.length
      : undefined

  return { character, shared, ratio }
}

export function computeStanding(
  marks: Partial<Record<ProvaId, number>>,
  characters: Character[],
): Standing {
  const results = characters.map((character) => compareWith(character, marks))
  const ranked = results
    .filter((result) => result.ratio !== undefined)
    .sort((a, b) => a.ratio! - b.ratio!)
  const unranked = results.filter((result) => result.ratio === undefined)

  // `ranked` vai do mais forte ao mais fraco: o primeiro alcançado é o mais
  // forte que você iguala, e o anterior a ele é o próximo da fila.
  const youIndex = ranked.findIndex((result) => result.ratio! >= 1)
  const you = youIndex >= 0 ? ranked[youIndex] : undefined
  const next = youIndex === -1 ? ranked[ranked.length - 1] : ranked[youIndex - 1]

  return { ranked, unranked, you, next }
}

/** "53,3 kg" ou "2:30", conforme a unidade da prova. */
export function formatMark(value: number, unit: ProvaUnit): string {
  return unit === 's' ? formatSeconds(value) : `${formatNumber(value)} kg`
}

/** 0,874 → "87%". */
export function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

/** Rótulo curto da métrica, para explicar o número na tela. */
export const METRIC_LABEL: Record<StrengthMetric, string> = {
  e1rm: 'carga máxima estimada',
  maxWeight: 'maior peso levantado',
}
