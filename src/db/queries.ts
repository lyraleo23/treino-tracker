import Dexie from 'dexie'
import { db, type SetLog } from './db'

/**
 * Última série registrada para o exercício, considerando todo o histórico —
 * independente de treino ou sessão. É a fonte do peso pré-preenchido.
 */
export async function getLastSetForExercise(
  exerciseId: string,
  excludeSessionId?: string,
): Promise<SetLog | undefined> {
  const range = db.setLogs
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()

  if (!excludeSessionId) return range.first()
  return range.filter((log) => log.sessionId !== excludeSessionId).first()
}

/** Mapa exerciseId → última série, para pré-preencher a sessão de uma vez. */
export async function getLastSetsForExercises(
  exerciseIds: string[],
  excludeSessionId?: string,
): Promise<Map<string, SetLog>> {
  const entries = await Promise.all(
    exerciseIds.map(
      async (id) => [id, await getLastSetForExercise(id, excludeSessionId)] as const,
    ),
  )

  const map = new Map<string, SetLog>()
  for (const [id, log] of entries) {
    if (log) map.set(id, log)
  }
  return map
}

/** Agregado de um exercício dentro de uma sessão — uma linha do gráfico. */
export interface ExercisePoint {
  sessionId: string
  date: number
  sets: number
  maxWeight: number
  totalVolume: number
  totalReps: number
  maxSeconds: number
  totalSeconds: number
}

/**
 * Histórico do exercício agrupado por sessão, em ordem cronológica.
 * Alimenta tanto o gráfico de evolução quanto a tabela de execuções.
 */
export async function getExerciseHistory(exerciseId: string): Promise<ExercisePoint[]> {
  const logs = await db.setLogs
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .toArray()

  const bySession = new Map<string, ExercisePoint>()

  for (const log of logs) {
    let point = bySession.get(log.sessionId)
    if (!point) {
      point = {
        sessionId: log.sessionId,
        date: log.completedAt,
        sets: 0,
        maxWeight: 0,
        totalVolume: 0,
        totalReps: 0,
        maxSeconds: 0,
        totalSeconds: 0,
      }
      bySession.set(log.sessionId, point)
    }

    point.sets += 1
    point.date = Math.min(point.date, log.completedAt)
    point.maxWeight = Math.max(point.maxWeight, log.weight ?? 0)
    point.totalVolume += (log.weight ?? 0) * (log.reps ?? 0)
    point.totalReps += log.reps ?? 0
    point.maxSeconds = Math.max(point.maxSeconds, log.seconds ?? 0)
    point.totalSeconds += log.seconds ?? 0
  }

  return [...bySession.values()].sort((a, b) => a.date - b.date)
}

/** Resumo de uma sessão para a lista de histórico. */
export interface SessionSummary {
  sets: number
  volume: number
  seconds: number
  exercises: number
}

export async function getSessionSummary(sessionId: string): Promise<SessionSummary> {
  const logs = await db.setLogs.where('sessionId').equals(sessionId).toArray()
  const exercises = new Set(logs.map((l) => l.exerciseId))

  return {
    sets: logs.length,
    volume: logs.reduce((sum, l) => sum + (l.weight ?? 0) * (l.reps ?? 0), 0),
    seconds: logs.reduce((sum, l) => sum + (l.seconds ?? 0), 0),
    exercises: exercises.size,
  }
}

/** Sessão iniciada e ainda não finalizada, se houver. */
export async function getOpenSession() {
  const open = await db.sessions.filter((s) => s.finishedAt === undefined).toArray()
  return open.sort((a, b) => b.startedAt - a.startedAt)[0]
}
