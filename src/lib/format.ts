import type { Target, WorkoutItem } from '../db/db'

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
export function formatItemPlan(item: WorkoutItem): string {
  return `${item.sets} × ${formatTarget(item.target)}`
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
