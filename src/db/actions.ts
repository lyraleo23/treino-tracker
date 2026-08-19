import Dexie from 'dexie'
import {
  db,
  DEFAULT_HYDRATION,
  DEFAULT_LADDER_RATIOS,
  type CardioField,
  type Cycle,
  type Exercise,
  type ExerciseKind,
  type Flag,
  type LadderRatios,
  type Program,
  type Session,
  type SetBlock,
  type SetLog,
  type Workout,
  type WorkoutItem,
} from './db'
import { newId } from '../lib/id'
import { startOfDay } from '../lib/format'

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

/** Tira o exercício do catálogo sem tocar no que já foi levantado com ele. */
export async function setExerciseArchived(id: string, archived: Flag): Promise<void> {
  await db.exercises.update(id, { archived })
}

/**
 * Junta dois exercícios que deveriam ser um só: todo o histórico e as vagas em
 * treinos passam para o destino, e a origem sai do catálogo.
 *
 * Só o `exerciseId` é reescrito. Os logs guardam também `workoutItemId` e
 * `blockId`, que continuam apontando para itens e blocos intactos — por isso a
 * mesclagem não precisa mexer em mais nada.
 */
export async function mergeExercises(sourceId: string, targetId: string): Promise<void> {
  if (sourceId === targetId) return

  await db.transaction('rw', [db.exercises, db.workoutItems, db.setLogs], async () => {
    const target = await db.exercises.get(targetId)
    if (!target) return

    await db.setLogs.where('exerciseId').equals(sourceId).modify({ exerciseId: targetId })
    await db.workoutItems.where('exerciseId').equals(sourceId).modify({ exerciseId: targetId })
    await db.exercises.delete(sourceId)
  })
}

/**
 * Remove de vez o exercício, seus itens de treino e os blocos deles.
 *
 * Só vale para exercício **sem histórico**: apagar um que tem séries destruiria
 * sessões passadas que não dá para recriar. Com histórico o caminho é arquivar
 * ou mesclar — e a guarda mora aqui, não só na tela.
 */
export async function deleteExercise(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.exercises, db.workoutItems, db.setBlocks, db.setLogs],
    async () => {
      if ((await db.setLogs.where('exerciseId').equals(id).count()) > 0) return

      const items = await db.workoutItems.where('exerciseId').equals(id).toArray()
      // Os blocos são filhos do item: sem apagá-los aqui ficariam no banco sem
      // nenhum caminho que chegue de volta neles.
      for (const item of items) {
        await db.setBlocks.where('workoutItemId').equals(item.id).delete()
      }

      await db.workoutItems.where('exerciseId').equals(id).delete()
      await db.exercises.delete(id)
    },
  )
}

// --- Configuração -------------------------------------------------------

/** Grava as proporções da escada; a linha é criada no primeiro salvamento. */
export async function saveLadderRatios(ladder: LadderRatios): Promise<void> {
  const current = await db.settings.get('app')
  await db.settings.put({ ...current, id: 'app', ladder })
}

export async function saveHydrationGoal(goalMl: number): Promise<void> {
  const current = await db.settings.get('app')
  await db.settings.put({
    id: 'app',
    ladder: current?.ladder ?? DEFAULT_LADDER_RATIOS,
    hydration: { goalMl: Math.max(1, Math.round(goalMl)) },
  })
}

// --- Hidratação ---------------------------------------------------------

/** O quanto do volume conta para a meta, com a bebida sumida valendo integral. */
function countedFor(ml: number, factor: number | undefined): number {
  return Math.round(ml * (factor ?? 1))
}

/**
 * Registra um consumo. Congela duas coisas: o `countedMl` pelo fator vigente e
 * a meta do dia no `HydrationDay`. Sem isso, recalibrar um fator ou subir a
 * meta reescreveria dias já julgados.
 */
export async function logDrink(data: { drinkId: string; ml: number; at?: number }): Promise<void> {
  const at = data.at ?? Date.now()
  const day = startOfDay(at)

  await db.transaction('rw', [db.drinks, db.drinkLogs, db.hydrationDays, db.settings], async () => {
    const drink = await db.drinks.get(data.drinkId)

    if (!(await db.hydrationDays.get(day))) {
      const settings = await db.settings.get('app')
      await db.hydrationDays.add({
        day,
        goalMl: settings?.hydration?.goalMl ?? DEFAULT_HYDRATION.goalMl,
      })
    }

    await db.drinkLogs.add({
      id: newId(),
      day,
      at,
      drinkId: data.drinkId,
      ml: data.ml,
      countedMl: countedFor(data.ml, drink?.factor),
    })
  })
}

/**
 * Corrige um lançamento. Aqui o `countedMl` é recalculado com o fator **atual**
 * — quem está editando quer justamente o valor de hoje, não o congelado.
 */
export async function updateDrinkLog(
  id: string,
  data: { drinkId: string; ml: number },
): Promise<void> {
  const drink = await db.drinks.get(data.drinkId)
  await db.drinkLogs.update(id, {
    drinkId: data.drinkId,
    ml: data.ml,
    countedMl: countedFor(data.ml, drink?.factor),
  })
}

export async function deleteDrinkLog(id: string): Promise<void> {
  await db.drinkLogs.delete(id)
}

export async function saveDrink(
  data: { id?: string; name: string; factor: number },
): Promise<void> {
  if (data.id) {
    await db.drinks.update(data.id, { name: data.name.trim(), factor: data.factor })
    return
  }

  const last = await db.drinks.orderBy('order').last()
  await db.drinks.add({
    id: newId(),
    name: data.name.trim(),
    factor: data.factor,
    order: (last?.order ?? -1) + 1,
    archived: 0,
    createdAt: Date.now(),
  })
}

export async function saveContainer(
  data: { id?: string; name: string; ml: number },
): Promise<void> {
  if (data.id) {
    await db.containers.update(data.id, { name: data.name.trim(), ml: data.ml })
    return
  }

  const last = await db.containers.orderBy('order').last()
  await db.containers.add({
    id: newId(),
    name: data.name.trim(),
    ml: data.ml,
    order: (last?.order ?? -1) + 1,
    archived: 0,
    createdAt: Date.now(),
  })
}

/** Apaga bebida ou recipiente do catálogo; os lançamentos ficam no histórico. */
export async function deleteDrink(id: string): Promise<void> {
  await db.transaction('rw', [db.drinks, db.drinkShortcuts], async () => {
    await db.drinkShortcuts.where('drinkId').equals(id).delete()
    await db.drinks.delete(id)
  })
}

export async function deleteContainer(id: string): Promise<void> {
  await db.transaction('rw', [db.containers, db.drinkShortcuts], async () => {
    await db.drinkShortcuts.where('containerId').equals(id).delete()
    await db.containers.delete(id)
  })
}

export async function addShortcut(drinkId: string, containerId: string): Promise<void> {
  const existing = await db.drinkShortcuts
    .filter((s) => s.drinkId === drinkId && s.containerId === containerId)
    .first()
  if (existing) return

  const last = await db.drinkShortcuts.orderBy('order').last()
  await db.drinkShortcuts.add({
    id: newId(),
    drinkId,
    containerId,
    order: (last?.order ?? -1) + 1,
  })
}

export async function deleteShortcut(id: string): Promise<void> {
  await db.drinkShortcuts.delete(id)
}

// --- Programas ----------------------------------------------------------

export async function createProgram(name: string, cycle?: Cycle): Promise<string> {
  const [last, total] = await Promise.all([
    db.programs.orderBy('order').last(),
    db.programs.count(),
  ])

  const program: Program = {
    id: newId(),
    name: name.trim(),
    order: (last?.order ?? -1) + 1,
    // Nasce guardado quando já existe um programa rodando: assim dá para montar
    // a próxima bateria com calma sem esvaziar a aba Treinos antes da hora.
    archived: total === 0 ? 0 : 1,
    createdAt: Date.now(),
    cycle,
    cycleStartedAt: cycle ? Date.now() : undefined,
  }
  await db.programs.add(program)
  return program.id
}

/** Ativa um programa e guarda os demais — só um fica ativo por vez. */
export async function activateProgram(id: string): Promise<void> {
  await db.transaction('rw', db.programs, async () => {
    await db.programs.toCollection().modify({ archived: 1 })
    await db.programs.update(id, { archived: 0 })
  })
}

export async function updateProgram(
  id: string,
  data: { name: string; cycle?: Cycle },
): Promise<void> {
  const current = await db.programs.get(id)
  if (!current) return

  // Começou um ciclo agora (ou trocou o método): a contagem recomeça.
  const cycleChanged = JSON.stringify(current.cycle) !== JSON.stringify(data.cycle)

  await db.programs.update(id, {
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
export async function renewProgramCycle(id: string): Promise<void> {
  const program = await db.programs.get(id)
  if (!program?.cycle) return

  const cycle: Cycle =
    program.cycle.kind === 'date'
      ? // Data já passou: estende pelo mesmo tamanho do ciclo anterior.
        {
          kind: 'date',
          until:
            Date.now() +
            Math.max(
              7 * 86400000,
              program.cycle.until - (program.cycleStartedAt ?? program.createdAt),
            ),
        }
      : program.cycle

  await db.programs.update(id, { cycle, cycleStartedAt: Date.now() })
}

/**
 * Apaga o programa e todo o plano dentro dele. As sessões já realizadas
 * continuam no histórico: elas guardam o nome do treino como snapshot.
 */
export async function deleteProgram(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.programs, db.workouts, db.workoutItems, db.setBlocks],
    async () => {
      // Sem nenhum programa não haveria onde criar treino: o último nunca sai.
      if ((await db.programs.count()) <= 1) return

      const program = await db.programs.get(id)
      // O ativo não se apaga; é preciso ativar outro antes.
      if (!program || program.archived === 0) return

      const workouts = await db.workouts.where('programId').equals(id).toArray()
      for (const workout of workouts) {
        const items = await db.workoutItems.where('workoutId').equals(workout.id).toArray()
        for (const item of items) {
          await db.setBlocks.where('workoutItemId').equals(item.id).delete()
        }
        await db.workoutItems.where('workoutId').equals(workout.id).delete()
      }

      await db.workouts.where('programId').equals(id).delete()
      await db.programs.delete(id)
    },
  )
}

/**
 * Copia o plano de um treino para outro programa: treino, itens e blocos com
 * ids novos. Sessões e séries não vêm junto — são histórico, não plano. Ainda
 * assim a cópia abre com as cargas certas, porque a busca do último peso casa
 * os blocos por papel e não por id.
 */
export async function copyWorkoutToProgram(
  workoutId: string,
  targetProgramId: string,
): Promise<string | undefined> {
  return db.transaction(
    'rw',
    [db.workouts, db.workoutItems, db.setBlocks],
    async () => {
      const source = await db.workouts.get(workoutId)
      if (!source) return undefined

      const last = await db.workouts
        .where('[programId+order]')
        .between([targetProgramId, Dexie.minKey], [targetProgramId, Dexie.maxKey])
        .last()

      const copy: Workout = {
        id: newId(),
        programId: targetProgramId,
        name: source.name,
        order: (last?.order ?? -1) + 1,
        archived: 0,
        createdAt: Date.now(),
      }
      await db.workouts.add(copy)

      const items = await db.workoutItems
        .where('[workoutId+order]')
        .between([workoutId, Dexie.minKey], [workoutId, Dexie.maxKey])
        .toArray()

      for (const item of items) {
        const itemCopy: WorkoutItem = { ...item, id: newId(), workoutId: copy.id }
        await db.workoutItems.add(itemCopy)

        const blocks = await db.setBlocks
          .where('[workoutItemId+order]')
          .between([item.id, Dexie.minKey], [item.id, Dexie.maxKey])
          .toArray()

        await db.setBlocks.bulkAdd(
          blocks.map((block) => ({ ...block, id: newId(), workoutItemId: itemCopy.id })),
        )
      }

      return copy.id
    },
  )
}

/** Clona o programa inteiro — o atalho para montar a próxima bateria. */
export async function duplicateProgram(id: string, name: string): Promise<string> {
  const source = await db.programs.get(id)
  const targetId = await createProgram(name, source?.cycle)

  const workouts = await db.workouts
    .where('[programId+order]')
    .between([id, Dexie.minKey], [id, Dexie.maxKey])
    .toArray()

  for (const workout of workouts) {
    await copyWorkoutToProgram(workout.id, targetId)
  }

  return targetId
}

// --- Treinos ------------------------------------------------------------

export async function createWorkout(programId: string, name: string): Promise<string> {
  const last = await db.workouts
    .where('[programId+order]')
    .between([programId, Dexie.minKey], [programId, Dexie.maxKey])
    .last()

  const workout: Workout = {
    id: newId(),
    programId,
    name: name.trim(),
    order: (last?.order ?? -1) + 1,
    archived: 0,
    createdAt: Date.now(),
  }
  await db.workouts.add(workout)
  return workout.id
}

export async function updateWorkout(id: string, data: { name: string }): Promise<void> {
  await db.workouts.update(id, { name: data.name.trim() })
}

/** Apaga o treino e seus itens; as sessões já realizadas continuam no histórico. */
export async function deleteWorkout(id: string): Promise<void> {
  await db.transaction('rw', [db.workouts, db.workoutItems, db.setBlocks], async () => {
    const items = await db.workoutItems.where('workoutId').equals(id).toArray()
    // Os blocos são filhos do item: sem apagá-los aqui ficariam no banco para
    // sempre, sem nenhum caminho que chegue de volta neles.
    for (const item of items) {
      await db.setBlocks.where('workoutItemId').equals(item.id).delete()
    }

    await db.workoutItems.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

/** Troca a posição de dois treinos adjacentes dentro do programa. */
export async function moveWorkout(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.workouts, async () => {
    const workout = await db.workouts.get(id)
    if (!workout) return

    // A ordem é interna ao programa: comparar com treinos de outra bateria
    // trocaria posições que não estão na tela.
    const all = await db.workouts
      .where('[programId+order]')
      .between([workout.programId, Dexie.minKey], [workout.programId, Dexie.maxKey])
      .toArray()

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
