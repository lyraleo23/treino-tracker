import Dexie from 'dexie'
import {
  db,
  DEFAULT_LADDER_RATIOS,
  type LadderRatios,
  type SetBlock,
  type SetLog,
  type Target,
} from './db'
import { anchorWeight, blockRole, isAnchorBlock, ladderIsBroken } from '../lib/ladder'

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

/** Última série registrada num bloco específico do treino. */
export async function getLastSetForBlock(
  blockId: string,
  excludeSessionId?: string,
): Promise<SetLog | undefined> {
  const range = db.setLogs
    .where('[blockId+completedAt]')
    .between([blockId, Dexie.minKey], [blockId, Dexie.maxKey])
    .reverse()

  if (!excludeSessionId) return range.first()
  return range.filter((log) => log.sessionId !== excludeSessionId).first()
}

/**
 * As séries da **última sessão** em que o bloco foi executado, indexadas por
 * posição. É o que permite a 2ª série voltar com o peso da 2ª série, e não com
 * o da última registrada.
 */
export interface BlockHistory {
  sessionId: string
  bySetIndex: Map<number, SetLog>
  /** A série mais pesada da sessão, usada como referência do bloco. */
  heaviest: SetLog
}

export async function getBlockHistory(
  blockId: string,
  excludeSessionId?: string,
): Promise<BlockHistory | undefined> {
  const logs = await db.setLogs
    .where('[blockId+completedAt]')
    .between([blockId, Dexie.minKey], [blockId, Dexie.maxKey])
    .reverse()
    .toArray()

  const relevant = excludeSessionId
    ? logs.filter((log) => log.sessionId !== excludeSessionId)
    : logs

  const mostRecent = relevant[0]
  if (!mostRecent) return undefined

  const fromSession = relevant.filter((log) => log.sessionId === mostRecent.sessionId)
  const bySetIndex = new Map(fromSession.map((log) => [log.setIndex, log]))
  const heaviest = fromSession.reduce((max, log) =>
    (log.weight ?? 0) > (max.weight ?? 0) ? log : max,
  )

  return { sessionId: mostRecent.sessionId, bySetIndex, heaviest }
}

/** Mapa blockId → histórico da última sessão, para montar a tela de uma vez. */
export async function getHistoryForBlocks(
  blockIds: string[],
  excludeSessionId?: string,
): Promise<Map<string, BlockHistory>> {
  const entries = await Promise.all(
    blockIds.map(
      async (id) => [id, await getBlockHistory(id, excludeSessionId)] as const,
    ),
  )

  const map = new Map<string, BlockHistory>()
  for (const [id, history] of entries) {
    if (history) map.set(id, history)
  }
  return map
}

/** As séries de um bloco numa ocasião passada, indexadas pela posição. */
export interface RoleHistory {
  bySetIndex: Map<number, SetLog>
  /** A série mais pesada do bloco, referência de carga dele. */
  heaviest: SetLog
  /** Quantas séries o bloco previa naquela ocasião — não hoje. */
  plannedSets: number
}

/**
 * A última vez que o exercício foi executado, **em qualquer treino**. Os blocos
 * vêm indexados por papel (`blockRole`) e não por id: é assim que o Working Set
 * do Lower Body 2 alcança o que foi levantado no Working Set do Lower Body 1.
 * Por `blockId` não daria — cada treino tem o seu próprio WorkoutItem e, com
 * ele, os seus próprios blocos.
 */
export interface PreviousExecution {
  sessionId: string
  workoutName: string
  startedAt: number
  finishedAt?: number
  /** A execução anterior foi no mesmo treino que está aberto agora? */
  sameWorkout: boolean
  byRole: Map<string, RoleHistory>
}

export async function getPreviousExecution(
  exerciseId: string,
  currentWorkoutId: string,
  excludeSessionId?: string,
): Promise<PreviousExecution | undefined> {
  const logs = await db.setLogs
    .where('[exerciseId+completedAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .toArray()

  const relevant = excludeSessionId
    ? logs.filter((log) => log.sessionId !== excludeSessionId)
    : logs

  const mostRecent = relevant[0]
  if (!mostRecent) return undefined

  const session = await db.sessions.get(mostRecent.sessionId)
  if (!session) return undefined

  // Só o item daquela ocasião interessa: é dele que saem os blocos com o tipo e
  // a ordem, e são eles que definem o papel de cada um.
  const fromSession = relevant.filter(
    (log) =>
      log.sessionId === mostRecent.sessionId &&
      log.workoutItemId === mostRecent.workoutItemId,
  )

  const blocks = await db.setBlocks
    .where('[workoutItemId+order]')
    .between(
      [mostRecent.workoutItemId, Dexie.minKey],
      [mostRecent.workoutItemId, Dexie.maxKey],
    )
    .toArray()

  const byRole = new Map<string, RoleHistory>()
  for (const block of blocks) {
    const blockLogs = fromSession.filter((log) => log.blockId === block.id)
    if (blockLogs.length === 0) continue

    byRole.set(blockRole(block, blocks), {
      bySetIndex: new Map(blockLogs.map((log) => [log.setIndex, log])),
      heaviest: blockLogs.reduce((max, log) =>
        (log.weight ?? 0) > (max.weight ?? 0) ? log : max,
      ),
      plannedSets: block.sets,
    })
  }

  // O treino de então pode ter sido reorganizado a ponto de nenhum bloco casar;
  // aí não há papel algum a herdar e quem chamou cai nos fallbacks de sempre.
  if (byRole.size === 0) return undefined

  return {
    sessionId: session.id,
    workoutName: session.workoutName,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    sameWorkout: session.workoutId === currentWorkoutId,
    byRole,
  }
}

/** Mapa exerciseId → execução anterior, para montar a sessão de uma vez. */
export async function getPreviousExecutions(
  exerciseIds: string[],
  currentWorkoutId: string,
  excludeSessionId?: string,
): Promise<Map<string, PreviousExecution>> {
  const entries = await Promise.all(
    exerciseIds.map(
      async (id) =>
        [id, await getPreviousExecution(id, currentWorkoutId, excludeSessionId)] as const,
    ),
  )

  const map = new Map<string, PreviousExecution>()
  for (const [id, execution] of entries) {
    if (execution) map.set(id, execution)
  }
  return map
}

/** Topo da faixa de repetições do alvo; undefined para alvos de tempo. */
function topReps(target: Target): number | undefined {
  if (target.kind === 'reps') return target.value
  if (target.kind === 'repsRange') return target.max
  return undefined
}

/** Piso da faixa; num alvo fixo o piso é o próprio número. */
function minReps(target: Target): number | undefined {
  if (target.kind === 'reps') return target.value
  if (target.kind === 'repsRange') return target.min
  return undefined
}

export type SuggestionKind = 'subir' | 'descer' | 'escada'

export interface ProgressionSuggestion {
  exerciseId: string
  sessionId: string
  kind: SuggestionKind
  title: string
  reason: string
  /** Carga de working da última sessão, ponto de partida da escada. */
  anchor: number
  /** blockId → carga usada na última sessão. */
  previous: Map<string, number | undefined>
}

/**
 * Lê a última sessão finalizada do exercício e decide se cabe sugerir algo.
 * Só working e top set entram no critério de subir/descer — a faixa baixa dos
 * feeders é preparação, não medida de evolução.
 */
export async function getProgressionSuggestion(
  exerciseId: string,
  blocks: SetBlock[],
  currentWorkoutId: string,
  excludeSessionId: string,
): Promise<ProgressionSuggestion | null> {
  const anchorBlocks = blocks.filter((block) => isAnchorBlock(block.kind))
  if (anchorBlocks.length === 0) return null

  const execution = await getPreviousExecution(
    exerciseId,
    currentWorkoutId,
    excludeSessionId,
  )
  if (!execution?.finishedAt) return null

  // Carga de referência de cada bloco naquela sessão: a série mais pesada do
  // bloco de mesmo papel. É o casamento por papel — e não por id — que faz a
  // escada atravessar treinos diferentes.
  const previous = new Map<string, number | undefined>()
  for (const block of blocks) {
    const weight = execution.byRole.get(blockRole(block, blocks))?.heaviest.weight
    previous.set(block.id, weight !== undefined && weight > 0 ? weight : undefined)
  }

  const anchor = anchorWeight(blocks, previous)
  if (anchor === undefined) return null

  const alcancado: number[] = []
  let todosNoTopo = true
  let abaixoDoMinimo = false

  for (const block of anchorBlocks) {
    const top = topReps(block.target)
    const floor = minReps(block.target)
    if (top === undefined || floor === undefined) return null

    const history = execution.byRole.get(blockRole(block, blocks))
    const blockLogs = [...(history?.bySetIndex.values() ?? [])].sort(
      (a, b) => a.setIndex - b.setIndex,
    )
    // Treino incompleto não é progressão nem reprovação de carga. O planejado
    // que vale é o daquela ocasião: o mesmo working pode ser 1 série num treino
    // e 3 noutro, e comparar com o de hoje reprovaria a sessão à toa.
    if (blockLogs.length < (history?.plannedSets ?? block.sets)) todosNoTopo = false

    for (const log of blockLogs) {
      const reps = log.reps ?? 0
      alcancado.push(reps)
      if (reps < top) todosNoTopo = false
      if (reps < floor) abaixoDoMinimo = true
    }
  }

  // Vindo de outro treino, dizer qual evita a sugestão parecer saída do nada.
  const origem = execution.sameWorkout ? '' : ` (${execution.workoutName})`
  const base = { exerciseId, sessionId: execution.sessionId, anchor, previous }

  // Abaixo do mínimo pesa mais: carga excessiva é problema imediato.
  if (abaixoDoMinimo) {
    return {
      ...base,
      kind: 'descer',
      title: 'Sugerimos reduzir as cargas',
      reason: `Na última sessão${origem} alguma série de working ficou abaixo do mínimo da faixa (${alcancado.join(', ')} reps).`,
    }
  }

  if (todosNoTopo) {
    return {
      ...base,
      kind: 'subir',
      title: 'Sugerimos aumentar as cargas',
      reason: `Na última sessão${origem} você fechou o topo da faixa em todas as séries de working (${alcancado.join(', ')} reps).`,
    }
  }

  if (ladderIsBroken(blocks, previous)) {
    return {
      ...base,
      kind: 'escada',
      title: 'Sugerimos ajustar as cargas',
      reason: `Na última sessão${origem} os feeders não subiram em direção ao working set. A escada de carga rende mais preparando o movimento aos poucos.`,
    }
  }

  return null
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
  totalDistance: number
  /** Média das velocidades ponderada pelo tempo de cada trecho. */
  avgSpeed: number
  maxIncline: number
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
        totalDistance: 0,
        avgSpeed: 0,
        maxIncline: 0,
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
    point.totalDistance += log.distance ?? 0
    point.maxIncline = Math.max(point.maxIncline, log.incline ?? 0)
    // avgSpeed guarda a soma ponderada até o fim do laço.
    point.avgSpeed += (log.speed ?? 0) * (log.seconds ?? 0)
  }

  for (const point of bySession.values()) {
    point.avgSpeed = point.totalSeconds > 0 ? point.avgSpeed / point.totalSeconds : 0
  }

  return [...bySession.values()].sort((a, b) => a.date - b.date)
}

/** Proporções da escada configuradas; sem configuração salva, os padrões. */
export async function getLadderRatios(): Promise<LadderRatios> {
  return (await db.settings.get('app'))?.ladder ?? DEFAULT_LADDER_RATIOS
}

/** Sessão iniciada e ainda não finalizada, se houver. */
export async function getOpenSession() {
  const open = await db.sessions.filter((s) => s.finishedAt === undefined).toArray()
  return open.sort((a, b) => b.startedAt - a.startedAt)[0]
}
