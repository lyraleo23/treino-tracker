import type { BlockKind, Cycle, SetBlock, Target } from '../db/db'

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

export function formatDate(ts: number): string {
  return dateFormatter.format(ts)
}

export function formatDateTime(ts: number): string {
  return dateTimeFormatter.format(ts)
}

export function formatWeekday(ts: number): string {
  return weekdayFormatter.format(ts).replace('.', '')
}

/** 90 → "1:30"; 45 → "45s". */
export function formatSeconds(total: number): string {
  const seconds = Math.max(0, Math.round(total))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/** Sempre mm:ss — usado no cronômetro, onde o tamanho não pode variar. */
export function formatClock(total: number): string {
  const seconds = Math.max(0, Math.ceil(total))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function formatTarget(target: Target): string {
  switch (target.kind) {
    case 'reps':
      return `${target.value} reps`
    case 'repsRange':
      return `${target.min}–${target.max} reps`
    case 'time':
      return formatSeconds(target.seconds)
  }
}

/** "3 × 8–12 reps" */
export function formatBlockPlan(block: SetBlock): string {
  return `${block.sets} × ${formatTarget(block.target)}`
}

export const BLOCK_LABELS: Record<BlockKind, string> = {
  warmup: 'Aquecimento',
  feeder: 'Feeder Set',
  working: 'Working Set',
  top: 'Top Set',
  backoff: 'Back-off Set',
  drop: 'Drop Set',
  amrap: 'Máximo de reps',
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
  return target.kind === 'time' ? target.seconds : undefined
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
