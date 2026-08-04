import Dexie, { type Table } from 'dexie'
import { newId } from '../lib/id'

/** Exercício de repetições (peso × reps) ou de tempo (duração). */
export type ExerciseKind = 'reps' | 'time'

/** Flag booleana persistida como 0/1 porque o IndexedDB não indexa boolean. */
export type Flag = 0 | 1

/**
 * Exercício é uma entidade global do catálogo. Treinos apenas o referenciam,
 * e todo SetLog guarda o exerciseId — é isso que faz o peso ser lembrado
 * em qualquer treino ou sessão.
 */
export interface Exercise {
  id: string
  name: string
  kind: ExerciseKind
  muscleGroup?: string
  notes?: string
  archived: Flag
  createdAt: number
}

/** Um treino: "Treino A", "Treino B"... */
export interface Workout {
  id: string
  name: string
  order: number
  archived: Flag
  createdAt: number
}

export type Target =
  | { kind: 'reps'; value: number }
  | { kind: 'repsRange'; min: number; max: number }
  | { kind: 'time'; seconds: number }

/** Um exercício dentro de um treino. A prescrição fica nos blocos. */
export interface WorkoutItem {
  id: string
  workoutId: string
  exerciseId: string
  order: number
}

/**
 * Tipos de bloco de séries. Só `working` e `top` valem como critério de
 * progressão de carga — a faixa de aquecimento e feeder existe para preparar,
 * não para medir evolução.
 */
export type BlockKind =
  | 'warmup'
  | 'feeder'
  | 'working'
  | 'top'
  | 'backoff'
  | 'drop'
  | 'amrap'

/**
 * Um grupo de séries com a mesma prescrição dentro de um exercício:
 * "Feeder Set 1 — 2 séries de 5 a 6 reps, intervalo de 1 min".
 */
export interface SetBlock {
  id: string
  workoutItemId: string
  order: number
  kind: BlockKind
  /** Vazio usa o rótulo automático ("Feeder Set 2"). */
  label?: string
  sets: number
  target: Target
  restSeconds?: number
  /** Preenchido quando o intervalo é uma faixa ("2 a 3 min"). */
  restSecondsMax?: number
  note?: string
}

/** Uma execução de um treino. */
export interface Session {
  id: string
  workoutId: string
  /** Snapshot do nome: a sessão sobrevive à renomeação ou exclusão do treino. */
  workoutName: string
  startedAt: number
  finishedAt?: number
  notes?: string
  feeling?: string
  strongPoints?: string
  improvePoints?: string
}

/** Uma série efetivamente executada. */
export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  workoutItemId: string
  blockId: string
  setIndex: number
  weight?: number
  reps?: number
  seconds?: number
  note?: string
  completedAt: number
}

/** Formato da v1, onde a prescrição morava no próprio item do treino. */
type LegacyWorkoutItem = WorkoutItem & {
  sets?: number
  target?: Target
  restSeconds?: number
}

class TreinoDB extends Dexie {
  exercises!: Table<Exercise, string>
  workouts!: Table<Workout, string>
  workoutItems!: Table<WorkoutItem, string>
  setBlocks!: Table<SetBlock, string>
  sessions!: Table<Session, string>
  setLogs!: Table<SetLog, string>

  constructor() {
    super('treino-tracker')

    this.version(1).stores({
      exercises: 'id, name, kind, archived',
      workouts: 'id, order, archived',
      workoutItems: 'id, workoutId, exerciseId, [workoutId+order]',
      sessions: 'id, workoutId, startedAt, finishedAt',
      // O índice composto atende as duas consultas quentes: último peso do
      // exercício e a série histórica do gráfico de evolução.
      setLogs: 'id, sessionId, exerciseId, completedAt, [exerciseId+completedAt]',
    })

    this.version(2)
      .stores({
        setBlocks: 'id, workoutItemId, [workoutItemId+order]',
        setLogs:
          'id, sessionId, exerciseId, blockId, completedAt, [exerciseId+completedAt], [blockId+completedAt]',
      })
      .upgrade(async (tx) => {
        // Cada exercício da v1 tinha uma única prescrição: ela vira um bloco
        // working, e as séries já registradas passam a apontar para ele.
        const items = await tx.table<LegacyWorkoutItem>('workoutItems').toArray()
        const blockByItem = new Map<string, string>()

        const blocks: SetBlock[] = items.map((item) => {
          const id = newId()
          blockByItem.set(item.id, id)
          return {
            id,
            workoutItemId: item.id,
            order: 0,
            kind: 'working',
            sets: item.sets ?? 3,
            target: item.target ?? { kind: 'repsRange', min: 8, max: 12 },
            restSeconds: item.restSeconds,
          }
        })

        await tx.table('setBlocks').bulkAdd(blocks)

        await tx
          .table('workoutItems')
          .toCollection()
          .modify((item: LegacyWorkoutItem) => {
            delete item.sets
            delete item.target
            delete item.restSeconds
          })

        await tx
          .table('setLogs')
          .toCollection()
          .modify((log: SetLog) => {
            log.blockId = blockByItem.get(log.workoutItemId) ?? ''
          })
      })
  }
}

export const db = new TreinoDB()
