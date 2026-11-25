import type { Exercise, ExerciseVariant, SetLog } from '../db/db'

/**
 * Formas de fazer (barra, halteres, Smith) e exercícios equivalentes.
 *
 * O histórico de carga é de **exercício + forma**: o supino na barra e o supino
 * nos halteres pré-preenchem, sobem e descem cada um por si. As regras de quem
 * é dono de qual série moram aqui, num lugar só, para a tela, as consultas e a
 * Arena não discordarem:
 *
 * - exercício sem formas: todas as séries dele são uma coisa só, como sempre
 *   foi — inclusive as que ficaram com a forma de quando ele ainda tinha formas;
 * - série sem forma num exercício com formas (gravada antes delas existirem)
 *   conta para a forma padrão;
 * - série de uma forma que foi removida não conta para nenhuma: herdar a carga
 *   do halter no lugar da barra seria pior que começar do zero. Ela continua no
 *   gráfico do exercício.
 */

export function variantsOf(exercise: Exercise | undefined): ExerciseVariant[] {
  return exercise?.variants ?? []
}

/** A forma padrão; `undefined` quando o exercício tem uma forma só. */
export function defaultVariantId(exercise: Exercise | undefined): string | undefined {
  const variants = variantsOf(exercise)
  if (variants.length === 0) return undefined
  return variants.find((v) => v.id === exercise?.defaultVariantId)?.id ?? variants[0]!.id
}

/**
 * A forma que vale de fato: a pedida, se ela ainda existe; senão a padrão.
 * Um treino que apontava para uma forma apagada cai na padrão em vez de ficar
 * órfão.
 */
export function resolveVariantId(
  exercise: Exercise | undefined,
  wanted: string | undefined,
): string | undefined {
  const variants = variantsOf(exercise)
  if (variants.length === 0) return undefined
  if (wanted && variants.some((v) => v.id === wanted)) return wanted
  return defaultVariantId(exercise)
}

export function variantName(
  exercise: Exercise | undefined,
  variantId: string | undefined,
): string | undefined {
  if (!variantId) return undefined
  return variantsOf(exercise).find((v) => v.id === variantId)?.name
}

/** "Supino reto · Barra", ou só o nome quando não há forma. */
export function exerciseLabel(
  exercise: Exercise | undefined,
  variantId: string | undefined,
  fallback = 'Exercício removido',
): string {
  const name = exercise?.name ?? fallback
  const variant = variantName(exercise, variantId)
  return variant ? `${name} · ${variant}` : name
}

/** A forma de uma série já gravada, pelas regras do topo do arquivo. */
export function logVariantId(log: SetLog, exercise: Exercise | undefined): string | undefined {
  if (variantsOf(exercise).length === 0) return undefined
  return log.variantId ?? defaultVariantId(exercise)
}

export type LogFilter = (log: SetLog) => boolean

/**
 * Quais séries contam como histórico do exercício nesta forma. Confere também
 * o exercício: uma troca grava o equivalente no bloco do treino, e sem isso o
 * histórico do bloco misturaria os dois.
 */
export function historyFilter(exercise: Exercise, variantId: string | undefined): LogFilter {
  const wanted = resolveVariantId(exercise, variantId)
  const hasVariants = variantsOf(exercise).length > 0
  const fallback = defaultVariantId(exercise)

  return (log) => {
    if (log.exerciseId !== exercise.id) return false
    if (!hasVariants) return true
    return (log.variantId ?? fallback) === wanted
  }
}

/** Chave estável de exercício + forma, para mapas montados de uma vez. */
export function historyKey(exerciseId: string, variantId: string | undefined): string {
  return variantId ? `${exerciseId}|${variantId}` : exerciseId
}

/**
 * Os equivalentes de um exercício, nas duas direções, só os que dá para fazer
 * agora: no catálogo e com a mesma medição — trocar repetições por tempo
 * deixaria os blocos do treino sem sentido.
 */
export function equivalentsOf(exercise: Exercise, all: Exercise[]): Exercise[] {
  const own = new Set(exercise.equivalents ?? [])
  return all
    .filter(
      (other) =>
        other.id !== exercise.id &&
        (own.has(other.id) || (other.equivalents ?? []).includes(exercise.id)),
    )
    .filter((other) => other.archived === 0 && other.kind === exercise.kind)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/** Há para onde trocar? Outra forma do próprio exercício ou um equivalente. */
export function canSwap(exercise: Exercise, all: Exercise[]): boolean {
  return variantsOf(exercise).length > 1 || equivalentsOf(exercise, all).length > 0
}
