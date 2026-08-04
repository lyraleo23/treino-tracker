import {
  db,
  type Exercise,
  type Session,
  type SetBlock,
  type SetLog,
  type Workout,
  type WorkoutItem,
} from './db'
import { newId } from '../lib/id'

const FORMAT = 'treino-tracker-backup'
const VERSION = 2

export interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  exercises: Exercise[]
  workouts: Workout[]
  workoutItems: WorkoutItem[]
  setBlocks: SetBlock[]
  sessions: Session[]
  setLogs: SetLog[]
}

export async function exportBackup(): Promise<Backup> {
  const [exercises, workouts, workoutItems, setBlocks, sessions, setLogs] =
    await Promise.all([
      db.exercises.toArray(),
      db.workouts.toArray(),
      db.workoutItems.toArray(),
      db.setBlocks.toArray(),
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
    setBlocks,
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

/** Backup da v1: a prescrição vinha no item e não havia blocos. */
type LegacyItem = WorkoutItem & { sets?: number; target?: SetBlock['target'] }

/**
 * Converte um arquivo da v1 para o formato atual, gerando um bloco working por
 * exercício — a mesma transformação que a migração do banco faz.
 */
function migrateToV2(backup: Backup): Backup {
  if ((backup.version ?? 1) >= 2 && Array.isArray(backup.setBlocks)) return backup

  const blockByItem = new Map<string, string>()
  const setBlocks: SetBlock[] = (backup.workoutItems as LegacyItem[]).map((item) => {
    const id = newId()
    blockByItem.set(item.id, id)
    return {
      id,
      workoutItemId: item.id,
      order: 0,
      kind: 'working',
      sets: item.sets ?? 3,
      target: item.target ?? { kind: 'repsRange', min: 8, max: 12 },
    }
  })

  return {
    ...backup,
    version: VERSION,
    setBlocks,
    // Sem os campos da v1 o item não carrega prescrição duplicada para sempre.
    workoutItems: (backup.workoutItems as LegacyItem[]).map(
      ({ sets: _sets, target: _target, ...item }) => item,
    ),
    setLogs: backup.setLogs.map((log) => ({
      ...log,
      blockId: log.blockId || (blockByItem.get(log.workoutItemId) ?? ''),
    })),
  }
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
  if ((parsed.version ?? 1) > VERSION) {
    throw new Error('Backup gerado por uma versão mais nova do app.')
  }

  const backup = migrateToV2(parsed)

  await db.transaction(
    'rw',
    [db.exercises, db.workouts, db.workoutItems, db.setBlocks, db.sessions, db.setLogs],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.workouts.clear(),
        db.workoutItems.clear(),
        db.setBlocks.clear(),
        db.sessions.clear(),
        db.setLogs.clear(),
      ])
      await Promise.all([
        db.exercises.bulkAdd(backup.exercises),
        db.workouts.bulkAdd(backup.workouts),
        db.workoutItems.bulkAdd(backup.workoutItems),
        db.setBlocks.bulkAdd(backup.setBlocks),
        db.sessions.bulkAdd(backup.sessions),
        db.setLogs.bulkAdd(backup.setLogs),
      ])
    },
  )
}

export async function wipeAll(): Promise<void> {
  await db.transaction(
    'rw',
    [db.exercises, db.workouts, db.workoutItems, db.setBlocks, db.sessions, db.setLogs],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.workouts.clear(),
        db.workoutItems.clear(),
        db.setBlocks.clear(),
        db.sessions.clear(),
        db.setLogs.clear(),
      ])
    },
  )
}
