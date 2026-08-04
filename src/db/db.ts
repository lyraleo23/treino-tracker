import Dexie, { type Table } from 'dexie'

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

/** Um exercício dentro de um treino, com séries e alvo planejados. */
export interface WorkoutItem {
  id: string
  workoutId: string
  exerciseId: string
  order: number
  sets: number
  target: Target
  restSeconds?: number
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
}

/** Uma série efetivamente executada. */
export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  workoutItemId: string
  setIndex: number
  weight?: number
  reps?: number
  seconds?: number
  completedAt: number
}

class TreinoDB extends Dexie {
  exercises!: Table<Exercise, string>
  workouts!: Table<Workout, string>
  workoutItems!: Table<WorkoutItem, string>
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
  }
}

export const db = new TreinoDB()
