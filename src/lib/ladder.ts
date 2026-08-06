import { DEFAULT_WEIGHT_STEP, type BlockKind, type SetBlock } from '../db/db'

/**
 * Os blocos de um exercício formam uma escada ancorada no working set: o
 * working é a referência (100%) e os que vêm antes são proporções dele. Feeder
 * serve para preparar o padrão de movimento com carga menor, então precisa
 * subir em direção ao working, nunca alcançá-lo.
 */
const FEEDER_MIN = 0.7
const FEEDER_MAX = 0.85
const WARMUP_RATIO = 0.5

/** Proporção de cada feeder quando há N deles: 2 feeders → 0,70 e 0,85. */
function feederRatio(index: number, total: number): number {
  if (total <= 1) return FEEDER_MAX
  return FEEDER_MIN + ((FEEDER_MAX - FEEDER_MIN) * index) / (total - 1)
}

export function isAnchorBlock(kind: BlockKind): boolean {
  return kind === 'working' || kind === 'top'
}

/** Arredonda para o múltiplo do passo do aparelho, nunca abaixo de um passo. */
export function roundToStep(value: number, step: number): number {
  const safeStep = step > 0 ? step : DEFAULT_WEIGHT_STEP
  const rounded = Math.round(value / safeStep) * safeStep
  // Duas casas evitam o 29.999999999999996 do ponto flutuante.
  return Math.max(safeStep, Number(rounded.toFixed(2)))
}

export interface LadderEntry {
  block: SetBlock
  /** O que foi usado da última vez; undefined quando nunca foi registrado. */
  from?: number
  to: number
}

/**
 * Monta a escada inteira a partir de uma carga de working set. Blocos que não
 * são feeder nem aquecimento (back-off, drop) acompanham o mesmo delta do
 * working, para uma redução proposital não virar carga de working.
 */
export function buildLadder(
  blocks: SetBlock[],
  previous: Map<string, number | undefined>,
  anchor: number,
  step: number,
): LadderEntry[] {
  const feeders = blocks.filter((block) => block.kind === 'feeder')
  const previousAnchor = anchorWeight(blocks, previous)
  const delta = previousAnchor === undefined ? 0 : anchor - previousAnchor

  return blocks.map((block) => {
    const from = previous.get(block.id)

    if (isAnchorBlock(block.kind)) return { block, from, to: anchor }

    if (block.kind === 'feeder') {
      const index = feeders.findIndex((other) => other.id === block.id)
      return { block, from, to: roundToStep(anchor * feederRatio(index, feeders.length), step) }
    }

    if (block.kind === 'warmup') {
      return { block, from, to: roundToStep(anchor * WARMUP_RATIO, step) }
    }

    // Demais tipos: mantêm a própria carga, deslocada junto com o working.
    if (from === undefined) return { block, from, to: anchor }
    return { block, from, to: roundToStep(from + delta, step) }
  })
}

/** A carga de referência do exercício: a mais pesada entre os working/top. */
export function anchorWeight(
  blocks: SetBlock[],
  weights: Map<string, number | undefined>,
): number | undefined {
  const values = blocks
    .filter((block) => isAnchorBlock(block.kind))
    .map((block) => weights.get(block.id))
    .filter((weight): weight is number => weight !== undefined && weight > 0)

  return values.length > 0 ? Math.max(...values) : undefined
}

/**
 * A escada está torta quando a ordem é violada: um feeder que alcança o
 * working, ou um feeder que não passa do anterior. Só ordenação — cobrar
 * distância percentual implicaria com o arredondamento a cada sessão.
 */
export function ladderIsBroken(
  blocks: SetBlock[],
  weights: Map<string, number | undefined>,
): boolean {
  const anchor = anchorWeight(blocks, weights)
  if (anchor === undefined) return false

  const feeders = blocks
    .filter((block) => block.kind === 'feeder')
    .map((block) => weights.get(block.id))

  // Sem carga registrada em algum feeder não há o que comparar.
  if (feeders.some((weight) => weight === undefined || weight <= 0)) return false

  const values = feeders as number[]
  if (values.some((weight) => weight >= anchor)) return true

  return values.some((weight, index) => index > 0 && weight <= values[index - 1]!)
}
