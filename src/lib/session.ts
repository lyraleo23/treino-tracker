import type { Session } from '../db/db'

/**
 * Folga entre um toque de botão e a série mais próxima dele. Acima disso o
 * toque não representa o treino: é o check-in feito ainda em casa, ou a sessão
 * esquecida aberta e encerrada no dia seguinte.
 */
export const SESSION_GRACE_MS = 25 * 60 * 1000

/**
 * Quando o treino começou de fato. Vale o check-in — mas se a primeira série só
 * apareceu muito depois dele, quem começou o treino foi a série.
 */
export function effectiveStart(session: Session, firstLogAt?: number): number {
  if (firstLogAt === undefined) return session.startedAt
  return firstLogAt - session.startedAt > SESSION_GRACE_MS ? firstLogAt : session.startedAt
}

/**
 * Quando o treino acabou de fato. Mesma regra do outro lado: o fallback do
 * início não protegeria uma sessão esquecida aberta, que só é finalizada no dia
 * seguinte e renderia treze horas de duração.
 */
export function effectiveEnd(session: Session, lastLogAt?: number): number | undefined {
  if (session.finishedAt === undefined) return undefined
  if (lastLogAt === undefined) return session.finishedAt
  return session.finishedAt - lastLogAt > SESSION_GRACE_MS ? lastLogAt : session.finishedAt
}

/** Duração da sessão em ms; undefined enquanto ela não foi finalizada. */
export function sessionDuration(
  session: Session,
  firstLogAt?: number,
  lastLogAt?: number,
): number | undefined {
  const end = effectiveEnd(session, lastLogAt)
  if (end === undefined) return undefined
  return Math.max(0, end - effectiveStart(session, firstLogAt))
}

/** Os extremos de `completedAt` de uma sessão, que ancoram a duração. */
export function logBounds(logs: { completedAt: number }[]): {
  firstLogAt?: number
  lastLogAt?: number
} {
  if (logs.length === 0) return {}
  let first = logs[0]!.completedAt
  let last = first
  for (const log of logs) {
    if (log.completedAt < first) first = log.completedAt
    if (log.completedAt > last) last = log.completedAt
  }
  return { firstLogAt: first, lastLogAt: last }
}
