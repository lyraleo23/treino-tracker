import { db, type Exercise, type Session, type SetLog, type Workout, type WorkoutItem } from './db'

const FORMAT = 'treino-tracker-backup'
const VERSION = 1

export interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  exercises: Exercise[]
  workouts: Workout[]
  workoutItems: WorkoutItem[]
  sessions: Session[]
  setLogs: SetLog[]
}

export async function exportBackup(): Promise<Backup> {
  const [exercises, workouts, workoutItems, sessions, setLogs] = await Promise.all([
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.workoutItems.toArray(),
    db.sessions.toArray(),
    db.setLogs.toArray(),
  ])

  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    workouts,
    workoutItems,
    sessions,
    setLogs,
  }
}

function isBackup(value: unknown): value is Backup {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Backup>
  return (
    candidate.format === FORMAT &&
    Array.isArray(candidate.exercises) &&
    Array.isArray(candidate.workouts) &&
    Array.isArray(candidate.workoutItems) &&
    Array.isArray(candidate.sessions) &&
    Array.isArray(candidate.setLogs)
  )
}

/**
 * Restaura substituindo todo o conteúdo atual — importar é "voltar para este
 * backup", não mesclar duas bases (o que geraria ids duplicados).
 */
export async function importBackup(raw: string): Promise<void> {
  const parsed: unknown = JSON.parse(raw)
  if (!isBackup(parsed)) {
    throw new Error('Arquivo não é um backup válido do Treino Tracker.')
  }

  await db.transaction(
    'rw',
    [db.exercises, db.workouts, db.workoutItems, db.sessions, db.setLogs],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.workouts.clear(),
        db.workoutItems.clear(),
        db.sessions.clear(),
        db.setLogs.clear(),
      ])
      await Promise.all([
        db.exercises.bulkAdd(parsed.exercises),
        db.workouts.bulkAdd(parsed.workouts),
        db.workoutItems.bulkAdd(parsed.workoutItems),
        db.sessions.bulkAdd(parsed.sessions),
        db.setLogs.bulkAdd(parsed.setLogs),
      ])
    },
  )
}

export async function wipeAll(): Promise<void> {
  await db.transaction(
    'rw',
    [db.exercises, db.workouts, db.workoutItems, db.sessions, db.setLogs],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.workouts.clear(),
        db.workoutItems.clear(),
        db.sessions.clear(),
        db.setLogs.clear(),
      ])
    },
  )
}
