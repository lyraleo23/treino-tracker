import Dexie from 'dexie'
import { db, type Exercise, type SetLog } from './db'
import { CHARACTERS, getProva, PROVAS, RUNGS, type Prova, type ProvaId, type Rung } from './characters'
import {
  computeStanding,
  duelFor,
  loadOf,
  setStrength,
  strengthWindowStart,
  type Duel,
  type Standing,
} from '../lib/strength'
import { defaultVariantId, historyFilter } from '../lib/variants'

/**
 * As séries que disputam a prova do exercício: só as da forma padrão. A prova
 * descreve um movimento — o supino da Arena é o da barra —, e 20 kg em cada
 * halter não são a mesma marca que 20 kg na barra. Um equivalente com prova
 * própria disputa por ele mesmo.
 */
function arenaLogs(exercise: Exercise, logs: SetLog[]): SetLog[] {
  return logs.filter(historyFilter(exercise, defaultVariantId(exercise)))
}

/** A melhor série de um exercício na janela da Arena. */
export interface Mark {
  value: number
  at: number
  exerciseId: string
  sessionId: string
}

interface Scored {
  log: SetLog
  value: number
}

function score(logs: SetLog[], prova: Prova): Scored[] {
  const scored: Scored[] = []
  for (const log of logs) {
    const value = setStrength(log, prova.unit)
    if (value !== undefined) scored.push({ log, value })
  }
  return scored
}

function best(scored: Scored[]): Mark | undefined {
  let top: Scored | undefined
  for (const item of scored) {
    if (!top || item.value > top.value) top = item
  }
  return top
    ? {
        value: top.value,
        at: top.log.completedAt,
        exerciseId: top.log.exerciseId,
        sessionId: top.log.sessionId,
      }
    : undefined
}

export interface ExerciseDuel {
  prova: Prova
  /** Sua melhor marca na janela, contando a sessão em andamento. */
  mark?: Mark
  duel: Duel
  /**
   * Alcançados nesta sessão: estavam na frente da melhor marca de antes dela e
   * agora não estão mais. Vazio fora de uma sessão.
   */
  newlyBeaten: Rung[]
  /**
   * Quando cada degrau vencido foi alcançado (pela `Rung.key`): a primeira
   * série da janela que chegou lá.
   */
  beatenAt: Record<string, number>
}

/**
 * A disputa de um exercício: o rival, os vencidos e — dentro de uma sessão —
 * quem caiu nela. `null` quando o exercício não está ligado a uma prova.
 */
export async function getExerciseDuel(
  exerciseId: string,
  sessionId?: string,
): Promise<ExerciseDuel | null> {
  const exercise = await db.exercises.get(exerciseId)
  const prova = getProva(exercise?.prova)
  if (!exercise || !prova) return null

  const logs = await db.setLogs
    .where('[exerciseId+completedAt]')
    .between([exerciseId, strengthWindowStart()], [exerciseId, Dexie.maxKey])
    .toArray()

  const scored = score(arenaLogs(exercise, logs), prova)
  const mark = best(scored)
  const before = best(scored.filter((item) => item.log.sessionId !== sessionId))
  const duel = duelFor(prova.id, mark?.value, RUNGS)

  const newlyBeaten = sessionId
    ? duel.beaten.filter((r) => before === undefined || loadOf(r, prova.id)! > before.value)
    : []

  const chronological = [...scored].sort((a, b) => a.log.completedAt - b.log.completedAt)
  const beatenAt: Record<string, number> = {}
  for (const rung of duel.beaten) {
    const first = chronological.find((item) => item.value >= loadOf(rung, prova.id)!)
    if (first) beatenAt[rung.key] = first.log.completedAt
  }

  return { prova, mark, duel, newlyBeaten, beatenAt }
}

/** Sua marca numa prova: a melhor entre os exercícios ligados a ela. */
export interface ProvaMark {
  prova: Prova
  /** Os exercícios ligados à prova, arquivados inclusive. */
  exercises: Exercise[]
  /** Ausente quando nenhum deles tem série na janela. */
  mark?: Mark
}

export interface Arena {
  /** Só as provas com pelo menos um exercício ligado, na ordem do catálogo. */
  marks: ProvaMark[]
  standing: Standing
}

/**
 * Tudo o que a aba Arena mostra. Duas máquinas na mesma prova disputam
 * separadas no treino; aqui, vale a melhor das duas.
 */
export async function getArena(): Promise<Arena> {
  const exercises = await db.exercises.toArray()
  const logs = await db.setLogs.where('completedAt').aboveOrEqual(strengthWindowStart()).toArray()

  const logsByExercise = new Map<string, SetLog[]>()
  for (const log of logs) {
    const list = logsByExercise.get(log.exerciseId)
    if (list) list.push(log)
    else logsByExercise.set(log.exerciseId, [log])
  }

  const marks: ProvaMark[] = []
  const values: Partial<Record<ProvaId, number>> = {}

  for (const prova of PROVAS) {
    const linked = exercises.filter((exercise) => exercise.prova === prova.id)
    if (linked.length === 0) continue

    const scored = linked.flatMap((exercise) =>
      score(arenaLogs(exercise, logsByExercise.get(exercise.id) ?? []), prova),
    )
    const mark = best(scored)
    if (mark) values[prova.id] = mark.value
    marks.push({ prova, exercises: linked, mark })
  }

  return { marks, standing: computeStanding(values, CHARACTERS) }
}
