import type {
  BlockKind,
  CardioField,
  Cycle,
  ExerciseKind,
  SetBlock,
  Target,
} from '../db/db'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function formatDate(ts: number): string {
  return dateFormatter.format(ts)
}

export function formatDateTime(ts: number): string {
  return dateTimeFormatter.format(ts)
}

/** "14:32" — hora do lançamento. Só serve para instantes do próprio dia. */
export function formatTime(ts: number): string {
  return timeFormatter.format(ts)
}

export function formatWeekday(ts: number): string {
  return weekdayFormatter.format(ts).replace('.', '')
}

/** Meia-noite do dia daquele instante — base para contar dias de calendário. */
export function startOfDay(ts: number): number {
  const date = new Date(ts)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * "hoje" · "ontem" · "há 3 dias". Conta dias de calendário, não períodos de 24h:
 * às 8h da manhã, um treino das 22h de ontem é "ontem", não "há 10 horas".
 * Passado um mês a contagem perde a graça e a data cheia informa mais.
 */
export function formatRelativeDay(ts: number): string {
  const days = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 86400000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days <= 30) return `há ${days} dias`
  return formatDate(ts)
}

/** 90 → "1:30"; 45 → "45s". */
export function formatSeconds(total: number): string {
  const seconds = Math.max(0, Math.round(total))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * "750 ml" · "2,5 l" — volume na escala em que ele se lê. Acima de um litro a
 * tela viraria uma parede de números de quatro dígitos.
 */
export function formatMl(ml: number): string {
  const value = Math.max(0, Math.round(ml))
  if (value < 1000) return `${value} ml`
  return `${formatNumber(value / 1000, 2)} l`
}

/**
 * "42 min" · "1h10" — duração de treino, na escala em que ela se lê. Distinto
 * de `formatSeconds`, que é mm:ss e continua servindo às séries.
 */
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

/** Sempre mm:ss — usado no cronômetro, onde o tamanho não pode variar. */
export function formatClock(total: number): string {
  const seconds = Math.max(0, Math.ceil(total))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

/** "4 min · 6% · 4,2 km/h" — só as partes que a prescrição definiu. */
export function formatCardioTarget(target: Extract<Target, { kind: 'cardio' }>): string {
  const parts: string[] = []
  if (target.seconds) parts.push(formatSeconds(target.seconds))
  if (target.distance) parts.push(`${formatNumber(target.distance, 2)} km`)
  if (target.incline) parts.push(`${formatNumber(target.incline)}%`)
  if (target.resistance) parts.push(`nível ${formatNumber(target.resistance)}`)
  if (target.speed) parts.push(`${formatNumber(target.speed)} km/h`)
  return parts.length > 0 ? parts.join(' · ') : 'livre'
}

export function formatTarget(target: Target): string {
  switch (target.kind) {
    case 'reps':
      return `${target.value} reps`
    case 'repsRange':
      return `${target.min}–${target.max} reps`
    case 'time':
      return formatSeconds(target.seconds)
    case 'cardio':
      return formatCardioTarget(target)
  }
}

/**
 * "3 × 8–12 reps" — num trecho aeróbico de série única o "1 ×" só polui,
 * então some.
 */
export function formatBlockPlan(block: SetBlock): string {
  const target = formatTarget(block.target)
  if (block.target.kind === 'cardio' && block.sets === 1) return target
  return `${block.sets} × ${target}`
}

/**
 * As mesmas partes de `formatBlockPlan`, separadas: o alvo é o que se consulta
 * no meio da série, então a tela precisa poder destacá-lo sem o "3 ×" junto.
 */
export function blockPlanParts(block: SetBlock): { prefix?: string; target: string } {
  const target = formatTarget(block.target)
  if (block.target.kind === 'cardio' && block.sets === 1) return { target }
  return { prefix: `${block.sets} ×`, target }
}

/** "4:00 · 6% · 4,2 km/h · 142 bpm" — o que foi executado num trecho. */
export function formatCardioLog(log: {
  seconds?: number
  distance?: number
  speed?: number
  incline?: number
  resistance?: number
  heartRate?: number
  calories?: number
}): string {
  const parts: string[] = []
  if (log.seconds) parts.push(formatSeconds(log.seconds))
  if (log.distance) parts.push(`${formatNumber(log.distance, 2)} km`)
  if (log.incline) parts.push(`${formatNumber(log.incline)}%`)
  if (log.resistance) parts.push(`nível ${formatNumber(log.resistance)}`)
  if (log.speed) parts.push(`${formatNumber(log.speed)} km/h`)
  if (log.heartRate) parts.push(`${formatNumber(log.heartRate, 0)} bpm`)
  if (log.calories) parts.push(`${formatNumber(log.calories, 0)} kcal`)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

/** 4,2 km/h → "14:17 /km". Zero ou vazio não tem ritmo. */
export function formatPace(speed: number | undefined): string | undefined {
  if (!speed || speed <= 0) return undefined
  const secondsPerKm = 3600 / speed
  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = Math.round(secondsPerKm % 60)
  const carry = seconds === 60
  return `${carry ? minutes + 1 : minutes}:${String(carry ? 0 : seconds).padStart(2, '0')} /km`
}

export const BLOCK_LABELS: Record<BlockKind, string> = {
  warmup: 'Aquecimento',
  feeder: 'Feeder Set',
  working: 'Working Set',
  cluster: 'Cluster-Set',
  top: 'Top Set',
  backoff: 'Back-off Set',
  drop: 'Drop Set',
  amrap: 'Máximo de reps',
  interval: 'Trecho',
}

export const KIND_LABELS: Record<ExerciseKind, string> = {
  reps: 'Repetições',
  time: 'Tempo',
  cardio: 'Aeróbico',
}

export const CARDIO_LABELS: Record<CardioField, { short: string; unit: string }> = {
  seconds: { short: 'Tempo', unit: 's' },
  distance: { short: 'Distância', unit: 'km' },
  speed: { short: 'Velocidade', unit: 'km/h' },
  incline: { short: 'Inclinação', unit: '%' },
  resistance: { short: 'Resistência', unit: 'nível' },
  heartRate: { short: 'FC', unit: 'bpm' },
  calories: { short: 'Calorias', unit: 'kcal' },
}

/**
 * Rótulo do bloco. Sem nome próprio, numera dentro do mesmo tipo — como no
 * plano em papel: "Feeder Set 1", "Feeder Set 2", "Working Set 1"...
 */
export function formatBlockLabel(block: SetBlock, blocks: SetBlock[]): string {
  if (block.label?.trim()) return block.label.trim()

  const sameKind = blocks.filter((other) => other.kind === block.kind)
  const base = BLOCK_LABELS[block.kind]
  if (sameKind.length < 2) return base

  return `${base} ${sameKind.findIndex((other) => other.id === block.id) + 1}`
}

export interface CycleStatus {
  label: string
  expired: boolean
}

/** "sessão 5 de 12" · "vence em 12 dias" · "ciclo concluído". */
export function formatCycle(
  cycle: Cycle | undefined,
  doneSessions: number,
): CycleStatus | undefined {
  if (!cycle) return undefined

  if (cycle.kind === 'sessions') {
    const expired = doneSessions >= cycle.target
    return {
      label: expired
        ? 'ciclo concluído'
        : `sessão ${doneSessions + 1} de ${cycle.target}`,
      expired,
    }
  }

  const days = Math.ceil((cycle.until - Date.now()) / 86400000)
  if (days < 0) return { label: 'ciclo vencido', expired: true }
  if (days === 0) return { label: 'vence hoje', expired: false }
  return { label: `vence em ${days} ${days === 1 ? 'dia' : 'dias'}`, expired: false }
}

/** "2 feeder · 2 working · 8 séries" — resumo do exercício na lista do treino. */
export function formatBlocksSummary(blocks: SetBlock[]): string {
  if (blocks.length === 0) return 'sem blocos'

  const counts = new Map<BlockKind, number>()
  for (const block of blocks) {
    counts.set(block.kind, (counts.get(block.kind) ?? 0) + 1)
  }

  const parts = [...counts.entries()].map(
    ([kind, count]) => `${count} ${BLOCK_LABELS[kind].toLowerCase().replace(' set', '')}`,
  )
  const sets = blocks.reduce((sum, block) => sum + block.sets, 0)

  return `${parts.join(' · ')} · ${sets} séries`
}

/** "1 min" · "2 a 3 min" · "45s" */
export function formatRest(block: SetBlock): string | undefined {
  if (block.restSeconds === undefined) return undefined

  const asText = (seconds: number) =>
    seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds}s`

  if (block.restSecondsMax !== undefined && block.restSecondsMax !== block.restSeconds) {
    const min = block.restSeconds % 60 === 0 ? String(block.restSeconds / 60) : `${block.restSeconds}s`
    return `${min} a ${asText(block.restSecondsMax)}`
  }
  return asText(block.restSeconds)
}

/** Valor inicial de reps sugerido pelo alvo. */
export function targetReps(target: Target): number | undefined {
  if (target.kind === 'reps') return target.value
  if (target.kind === 'repsRange') return target.min
  return undefined
}

export function targetSeconds(target: Target): number | undefined {
  if (target.kind === 'time') return target.seconds
  if (target.kind === 'cardio') return target.seconds
  return undefined
}

/** Números com no máximo uma casa, sem zero à toa: 42.5 → "42,5"; 40 → "40". */
export function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: digits })
}

export function formatWeight(value: number | undefined): string {
  if (value === undefined || value === 0) return '—'
  return `${formatNumber(value)} kg`
}

/** Aceita vírgula como separador decimal, do jeito que o teclado brasileiro digita. */
export function parseNumber(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim()
  if (normalized === '') return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** "1850 kcal" — nunca precisa de escala como o ml, então só arredonda. */
export function formatKcal(value: number): string {
  return `${formatNumber(Math.max(0, value), 0)} kcal`
}

/** "42 g" — proteína, carboidrato ou gordura. */
export function formatGrams(value: number): string {
  return `${formatNumber(Math.max(0, value))} g`
}

export const DIET_CATEGORY_LABELS: Record<string, string> = {
  protein: 'Proteína',
  carbohydrate: 'Carboidrato',
  options: 'Opções',
}

/**
 * Normaliza texto para busca tolerante a acento e caixa ("cafe" encontra
 * "café"). Também corrige buscas que não davam match nenhum: teclados
 * mobile às vezes compõem acentos em forma Unicode diferente (NFD) da usada
 * nas strings do app (NFC) — `.includes()` puro falha nesse caso mesmo com
 * o texto visualmente idêntico. `normalize('NFD')` decompõe ambos os lados
 * antes de remover os diacríticos, então a comparação nunca depende de qual
 * forma o texto de origem chegou.
 */
export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}
