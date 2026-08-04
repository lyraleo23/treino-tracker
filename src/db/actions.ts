import Dexie from 'dexie'
import {
  db,
  type Exercise,
  type ExerciseKind,
  type Session,
  type SetLog,
  type Target,
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
}): Promise<string> {
  const exercise: Exercise = {
    id: newId(),
    name: data.name.trim(),
    kind: data.kind,
    muscleGroup: data.muscleGroup?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    archived: 0,
    createdAt: Date.now(),
  }
  await db.exercises.add(exercise)
  return exercise.id
}

export async function updateExercise(
  id: string,
  data: Partial<Pick<Exercise, 'name' | 'kind' | 'muscleGroup' | 'notes' | 'archived'>>,
): Promise<void> {
  await db.exercises.update(id, data)
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

export async function createWorkout(name: string): Promise<string> {
  const last = await db.workouts.orderBy('order').last()
  const workout: Workout = {
    id: newId(),
    name: name.trim(),
    order: (last?.order ?? -1) + 1,
    archived: 0,
    createdAt: Date.now(),
  }
  await db.workouts.add(workout)
  return workout.id
}

export async function renameWorkout(id: string, name: string): Promise<void> {
  await db.workouts.update(id, { name: name.trim() })
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
  sets: number
  target: Target
  restSeconds?: number
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
    sets: data.sets,
    target: data.target,
    restSeconds: data.restSeconds,
  }
  await db.workoutItems.add(item)
  return item.id
}

export async function updateWorkoutItem(
  id: string,
  data: Partial<Pick<WorkoutItem, 'sets' | 'target' | 'restSeconds'>>,
): Promise<void> {
  await db.workoutItems.update(id, data)
}

export async function deleteWorkoutItem(id: string): Promise<void> {
  await db.workoutItems.delete(id)
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

export async function updateSessionNotes(sessionId: string, notes: string): Promise<void> {
  await db.sessions.update(sessionId, { notes: notes.trim() || undefined })
}

// --- Séries registradas -------------------------------------------------

export async function saveSetLog(data: {
  id?: string
  sessionId: string
  exerciseId: string
  workoutItemId: string
  setIndex: number
  weight?: number
  reps?: number
  seconds?: number
}): Promise<string> {
  if (data.id) {
    await db.setLogs.update(data.id, {
      weight: data.weight,
      reps: data.reps,
      seconds: data.seconds,
    })
    return data.id
  }

  const log: SetLog = {
    id: newId(),
    sessionId: data.sessionId,
    exerciseId: data.exerciseId,
    workoutItemId: data.workoutItemId,
    setIndex: data.setIndex,
    weight: data.weight,
    reps: data.reps,
    seconds: data.seconds,
    completedAt: Date.now(),
  }
  await db.setLogs.add(log)
  return log.id
}

export async function deleteSetLog(id: string): Promise<void> {
  await db.setLogs.delete(id)
}
