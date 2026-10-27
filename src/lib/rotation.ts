import type { Workout } from '../db/db'

export interface RotationEntry {
  workout: Workout
  /** Sem exercício não dá para iniciar, então a vez não para nele. */
  exercises: number
  /** Fim da sessão mais recente deste treino. */
  lastSession?: number
}

/**
 * O treino da vez: o seguinte, na ordem do programa, ao último treino da
 * rotação que foi feito — depois do A vem o B, depois do último volta ao
 * primeiro. Nunca feito nenhum, começa pelo primeiro.
 *
 * Os avulsos ficam de fora dos dois lados: fazer o aeróbico não move a vez, e a
 * vez nunca cai nele. Recebe as entradas já na ordem do programa; devolve
 * também o último feito, que é o porquê da escolha.
 */
export function rotationTurn<T extends RotationEntry>(
  entries: T[],
): { next?: T; last?: T } {
  const rotation = entries.filter((entry) => !entry.workout.outOfRotation)

  let last: T | undefined
  for (const entry of rotation) {
    if (entry.lastSession !== undefined && entry.lastSession > (last?.lastSession ?? 0)) {
      last = entry
    }
  }

  const start = last ? rotation.indexOf(last) + 1 : 0
  for (let step = 0; step < rotation.length; step++) {
    const entry = rotation[(start + step) % rotation.length]!
    if (entry.exercises > 0) return { next: entry, last }
  }
  return { last }
}
