import Dexie from 'dexie'
import {
  db,
  type CardioField,
  type Cycle,
  type Exercise,
  type ExerciseKind,
  type Session,
  type SetBlock,
  type SetLog,
  type Workout,
  type WorkoutItem,
} from './db'
import { newId } from '../lib/id'

// --- Exercícios ---------------------------------------------------------

export async function createExercise(data: {
  name: string
  kind: ExerciseKind
  muscleGroup?: string
  notes?: string
  videoUrl?: string
  photo?: Blob
  cardioFields?: CardioField[]
  weightStep?: number
}): Promise<string> {
  const exercise: Exercise = {
    id: newId(),
    name: data.name.trim(),
    kind: data.kind,
    muscleGroup: data.muscleGroup?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    videoUrl: data.videoUrl?.trim() || undefined,
    cardioFields: data.cardioFields,
    weightStep: data.weightStep,
    photo: data.photo,
    photoUpdatedAt: data.photo ? Date.now() : undefined,
    archived: 0,
    createdAt: Date.now(),
  }
  await db.exercises.add(exercise)
  return exercise.id
}

export async function updateExercise(
  id: string,
  data: Partial<
    Pick<
      Exercise,
      | 'name'
      | 'kind'
      | 'muscleGroup'
      | 'notes'
      | 'archived'
      | 'photo'
      | 'videoUrl'
      | 'cardioFields'
      | 'weightStep'
    >
  >,
): Promise<void> {
  await db.exercises.update(id, data)
}

/** Passar `undefined` remove a foto. */
export async function setExercisePhoto(id: string, photo: Blob | undefined): Promise<void> {
  await db.exercises.update(id, {
    photo,
    photoUpdatedAt: photo ? Date.now() : undefined,
  })
}

/**
 * Remove o exercício do catálogo e de todos os treinos. O histórico (SetLog)
 * é preservado — apagá-lo destruiria sessões passadas.
 */
export async function deleteExercise(id: string): Promise<void> {
  await db.transaction('rw', db.exercises, db.workoutItems, async () => {
    await db.workoutItems.where('exerciseId').equals(id).delete()
    await db.exercises.delete(id)
  })
}

// --- Treinos ------------------------------------------------------------

export async function createWorkout(name: string, cycle?: Cycle): Promise<string> {
  const last = await db.workouts.orderBy('order').last()
  const workout: Workout = {
    id: newId(),
    name: name.trim(),
    order: (last?.order ?? -1) + 1,
    archived: 0,
    createdAt: Date.now(),
    cycle,
    cycleStartedAt: cycle ? Date.now() : undefined,
  }
  await db.workouts.add(workout)
  return workout.id
}

export async function updateWorkout(
  id: string,
  data: { name: string; cycle?: Cycle },
): Promise<void> {
  const current = await db.workouts.get(id)
  if (!current) return

  // Começou um ciclo agora (ou trocou o método): a contagem recomeça.
  const cycleChanged = JSON.stringify(current.cycle) !== JSON.stringify(data.cycle)

  await db.workouts.update(id, {
    name: data.name.trim(),
    cycle: data.cycle,
    cycleStartedAt: data.cycle
      ? cycleChanged
        ? Date.now()
        : (current.cycleStartedAt ?? Date.now())
      : undefined,
  })
}

/** Recomeça a contagem do ciclo mantendo o método escolhido. */
export async function renewCycle(id: string): Promise<void> {
  const workout = await db.workouts.get(id)
  if (!workout?.cycle) return

  const cycle: Cycle =
    workout.cycle.kind === 'date'
      ? // Data já passou: estende pelo mesmo tamanho do ciclo anterior.
        {
          kind: 'date',
          until:
            Date.now() +
            Math.max(
              7 * 86400000,
              workout.cycle.until - (workout.cycleStartedAt ?? workout.createdAt),
            ),
        }
      : workout.cycle

  await db.workouts.update(id, { cycle, cycleStartedAt: Date.now() })
}

/** Apaga o treino e seus itens; as sessões já realizadas continuam no histórico. */
export async function deleteWorkout(id: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.workoutItems, async () => {
    await db.workoutItems.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

/** Troca a posição de dois treinos adjacentes. */
export async function moveWorkout(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.workouts, async () => {
    const all = await db.workouts.orderBy('order').toArray()
    const index = all.findIndex((w) => w.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= all.length) return

    const current = all[index]!
    const other = all[target]!
    await db.workouts.update(current.id, { order: other.order })
    await db.workouts.update(other.id, { order: current.order })
  })
}

// --- Itens do treino ----------------------------------------------------

export async function addWorkoutItem(data: {
  workoutId: string
  exerciseId: string
  preset?: BlockPreset
}): Promise<string> {
  const last = await db.workoutItems
    .where('[workoutId+order]')
    .between([data.workoutId, Dexie.minKey], [data.workoutId, Dexie.maxKey])
    .last()

  const item: WorkoutItem = {
    id: newId(),
    workoutId: data.workoutId,
    exerciseId: data.exerciseId,
    order: (last?.order ?? -1) + 1,
  }
  await db.workoutItems.add(item)

  if (data.preset) await applyPreset(item.id, data.preset)
  return item.id
}

/** Remove o exercício do treino junto com os blocos que só existiam nele. */
export async function deleteWorkoutItem(id: string): Promise<void> {
  await db.transaction('rw', db.workoutItems, db.setBlocks, async () => {
    await db.setBlocks.where('workoutItemId').equals(id).delete()
    await db.workoutItems.delete(id)
  })
}

export async function moveWorkoutItem(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.workoutItems, async () => {
    const item = await db.workoutItems.get(id)
    if (!item) return

    const siblings = await db.workoutItems
      .where('[workoutId+order]')
      .between([item.workoutId, Dexie.minKey], [item.workoutId, Dexie.maxKey])
      .toArray()

    const index = siblings.findIndex((i) => i.id === id)
    const target = index + direction
    if (target < 0 || target >= siblings.length) return

    const other = siblings[target]!
    await db.workoutItems.update(item.id, { order: other.order })
    await db.workoutItems.update(other.id, { order: item.order })
  })
}

// --- Blocos de séries ---------------------------------------------------

export type BlockPreset = 'feederWorking' | 'simple' | 'time' | 'cardio' | 'cardioLadder'

type BlockDraft = Omit<SetBlock, 'id' | 'workoutItemId' | 'order'>

/**
 * Modelos prontos para não montar quatro blocos na mão a cada exercício.
 * `feederWorking` reproduz a estrutura do plano Upper Body.
 */
const PRESETS: Record<BlockPreset, BlockDraft[]> = {
  feederWorking: [
    { kind: 'feeder', sets: 2, target: { kind: 'repsRange', min: 5, max: 6 }, restSeconds: 60 },
    { kind: 'feeder', sets: 2, target: { kind: 'repsRange', min: 5, max: 6 }, restSeconds: 120 },
    {
      kind: 'working',
      sets: 2,
      target: { kind: 'repsRange', min: 8, max: 10 },
      restSeconds: 120,
      restSecondsMax: 180,
    },
    {
      kind: 'working',
      sets: 2,
      target: { kind: 'repsRange', min: 8, max: 10 },
      restSeconds: 120,
      restSecondsMax: 180,
    },
  ],
  simple: [
    {
      kind: 'working',
      sets: 3,
      target: { kind: 'repsRange', min: 8, max: 12 },
      restSeconds: 120,
    },
  ],
  time: [{ kind: 'working', sets: 3, target: { kind: 'time', seconds: 60 }, restSeconds: 60 }],
  cardio: [{ kind: 'interval', sets: 1, target: { kind: 'cardio', seconds: 20 * 60 } }],
  // Quatro trechos de 4 min, prontos para receber inclinação e velocidade.
  cardioLadder: Array.from({ length: 4 }, () => ({
    kind: 'interval' as const,
    sets: 1,
    target: { kind: 'cardio' as const, seconds: 4 * 60 },
  })),
}

/** Bloco de aquecimento sugerido ao adicionar um do tipo warmup. */
export const WARMUP_DEFAULT: BlockDraft = {
  kind: 'warmup',
  sets: 2,
  target: { kind: 'repsRange', min: 15, max: 20 },
  note: 'carga moderada',
}

async function nextBlockOrder(workoutItemId: string): Promise<number> {
  const last = await db.setBlocks
    .where('[workoutItemId+order]')
    .between([workoutItemId, Dexie.minKey], [workoutItemId, Dexie.maxKey])
    .last()
  return (last?.order ?? -1) + 1
}

export async function addSetBlock(
  workoutItemId: string,
  draft: BlockDraft,
): Promise<string> {
  const block: SetBlock = {
    ...draft,
    id: newId(),
    workoutItemId,
    order: await nextBlockOrder(workoutItemId),
  }
  await db.setBlocks.add(block)
  return block.id
}

export async function applyPreset(
  workoutItemId: string,
  preset: BlockPreset,
): Promise<void> {
  const start = await nextBlockOrder(workoutItemId)
  const blocks: SetBlock[] = PRESETS[preset].map((draft, index) => ({
    ...draft,
    id: newId(),
    workoutItemId,
    order: start + index,
  }))
  await db.setBlocks.bulkAdd(blocks)
}

export async function updateSetBlock(
  id: string,
  data: Partial<BlockDraft>,
): Promise<void> {
  await db.setBlocks.update(id, data)
}

export async function deleteSetBlock(id: string): Promise<void> {
  await db.setBlocks.delete(id)
}

/** Duplica o bloco logo após o original — atalho para "Working Set 2". */
export async function duplicateSetBlock(id: string): Promise<void> {
  await db.transaction('rw', db.setBlocks, async () => {
    const block = await db.setBlocks.get(id)
    if (!block) return

    const siblings = await db.setBlocks
      .where('[workoutItemId+order]')
      .between([block.workoutItemId, Dexie.minKey], [block.workoutItemId, Dexie.maxKey])
      .toArray()

    // Abre espaço depois do original para a cópia entrar em seguida.
    for (const sibling of siblings) {
      if (sibling.order > block.order) {
        await db.setBlocks.update(sibling.id, { order: sibling.order + 1 })
      }
    }

    const { id: _ignored, ...rest } = block
    await db.setBlocks.add({ ...rest, id: newId(), order: block.order + 1 })
  })
}

export async function moveSetBlock(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.setBlocks, async () => {
    const block = await db.setBlocks.get(id)
    if (!block) return

    const siblings = await db.setBlocks
      .where('[workoutItemId+order]')
      .between([block.workoutItemId, Dexie.minKey], [block.workoutItemId, Dexie.maxKey])
      .toArray()

    const index = siblings.findIndex((b) => b.id === id)
    const target = index + direction
    if (target < 0 || target >= siblings.length) return

    const other = siblings[target]!
    await db.setBlocks.update(block.id, { order: other.order })
    await db.setBlocks.update(other.id, { order: block.order })
  })
}

// --- Sessões ------------------------------------------------------------

export async function startSession(workout: Workout): Promise<string> {
  const session: Session = {
    id: newId(),
    workoutId: workout.id,
    workoutName: workout.name,
    startedAt: Date.now(),
  }
  await db.sessions.add(session)
  return session.id
}

/**
 * Finaliza a sessão. Se nada foi registrado, descarta em vez de deixar uma
 * sessão vazia poluindo o histórico.
 */
export async function finishSession(sessionId: string): Promise<'finished' | 'discarded'> {
  const logs = await db.setLogs.where('sessionId').equals(sessionId).count()
  if (logs === 0) {
    await discardSession(sessionId)
    return 'discarded'
  }
  await db.sessions.update(sessionId, { finishedAt: Date.now() })
  return 'finished'
}

export async function discardSession(sessionId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.setLogs, async () => {
    await db.setLogs.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

type SessionNotes = Pick<
  Session,
  'notes' | 'feeling' | 'strongPoints' | 'improvePoints'
>

export async function updateSessionNotes(
  sessionId: string,
  data: SessionNotes,
): Promise<void> {
  const clean = (value?: string) => value?.trim() || undefined
  await db.sessions.update(sessionId, {
    notes: clean(data.notes),
    feeling: clean(data.feeling),
    strongPoints: clean(data.strongPoints),
    improvePoints: clean(data.improvePoints),
  })
}

// --- Séries registradas -------------------------------------------------

export async function saveSetLog(data: {
  id?: string
  sessionId: string
  exerciseId: string
  workoutItemId: string
  blockId: string
  setIndex: number
  weight?: number
  reps?: number
  seconds?: number
  distance?: number
  speed?: number
  incline?: number
  resistance?: number
  heartRate?: number
  calories?: number
  note?: string
}): Promise<string> {
  const measures = {
    weight: data.weight,
    reps: data.reps,
    seconds: data.seconds,
    distance: data.distance,
    speed: data.speed,
    incline: data.incline,
    resistance: data.resistance,
    heartRate: data.heartRate,
    calories: data.calories,
    note: data.note?.trim() || undefined,
  }

  if (data.id) {
    await db.setLogs.update(data.id, measures)
    return data.id
  }

  const log: SetLog = {
    id: newId(),
    sessionId: data.sessionId,
    exerciseId: data.exerciseId,
    workoutItemId: data.workoutItemId,
    blockId: data.blockId,
    setIndex: data.setIndex,
    ...measures,
    completedAt: Date.now(),
  }
  await db.setLogs.add(log)
  return log.id
}

export async function deleteSetLog(id: string): Promise<void> {
  await db.setLogs.delete(id)
}
