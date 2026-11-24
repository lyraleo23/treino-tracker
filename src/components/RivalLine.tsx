import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_WEIGHT_STEP, type Exercise, type SetBlock } from '../db/db'
import { getExerciseDuel } from '../db/arena'
import type { Character } from '../db/characters'
import { beep } from '../lib/feedback'
import {
  formatMark,
  goalReps,
  loadOf,
  loadToReach,
  STRENGTH_METRIC,
} from '../lib/strength'
import { formatNumber, formatSeconds } from '../lib/format'
import { CharacterAvatar } from './CharacterAvatar'

interface Props {
  exercise: Exercise
  sessionId: string
  blocks: SetBlock[]
}

/** Blocos cuja faixa de repetições vira a meta: os que medem força. */
const GOAL_BLOCKS = new Set(['working', 'top', 'cluster'])

/**
 * Repetições da meta: o topo da faixa do primeiro bloco que mede força. É onde
 * a progressão do app já manda chegar antes de subir a carga.
 */
function repsForGoal(blocks: SetBlock[]): number | undefined {
  const block =
    blocks.find((b) => GOAL_BLOCKS.has(b.kind) && b.target.kind !== 'time') ??
    blocks.find((b) => b.target.kind === 'reps' || b.target.kind === 'repsRange')
  if (!block) return undefined
  if (block.target.kind === 'reps') return block.target.value
  if (block.target.kind === 'repsRange') return block.target.max
  return undefined
}

function joinNames(characters: Character[]): string {
  const names = characters.map((c) => c.name)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

/**
 * "Disputando com FULANO" no cartão do exercício, durante o treino. Só
 * informa: não mexe em carga nem em sugestão.
 */
export function RivalLine({ exercise, sessionId, blocks }: Props) {
  const navigate = useNavigate()
  const result = useLiveQuery(
    () => getExerciseDuel(exercise.id, sessionId),
    [exercise.id, sessionId],
  )

  // Bipe quando uma série derruba alguém — mas não ao abrir uma sessão em que
  // isso já tinha acontecido. Silencioso se o áudio ainda não foi liberado.
  const seen = useRef<number | null>(null)
  const newly = result?.newlyBeaten.length
  useEffect(() => {
    if (newly === undefined) return
    if (seen.current !== null && newly > seen.current) beep(3)
    seen.current = newly
  }, [newly])

  if (!result) return null
  const { prova, mark, duel, newlyBeaten } = result
  if (duel.beaten.length === 0 && duel.ahead.length === 0) return null

  const open = (character: Character) =>
    navigate(`/arena/${character.id}`, {
      state: { from: `/sessao/${sessionId}`, label: 'Treino' },
    })

  const victory = newlyBeaten.length > 0 && (
    <div className="rival rival--won">
      <span className="rival__trophy" aria-hidden="true">
        🏆
      </span>
      <div className="rival__text">
        <strong>Você venceu {joinNames(newlyBeaten)}!</strong>
        <div>Nesta sessão, {prova.inPhrase}.</div>
      </div>
    </div>
  )

  const { rival } = duel
  if (!rival) {
    return (
      <>
        {victory}
        <div className="rival">
          <span className="rival__trophy" aria-hidden="true">
            👑
          </span>
          <div className="rival__text">
            <strong>Ninguém aguenta mais que você</strong>
            <div>{prova.inPhrase}, entre os personagens da Arena.</div>
          </div>
        </div>
      </>
    )
  }

  const theirs = loadOf(rival, prova.id)!
  const gap = mark ? theirs - mark.value : undefined

  let goal: string | undefined
  if (prova.unit === 's') {
    goal = `segurar ${formatSeconds(theirs)}`
  } else if (STRENGTH_METRIC === 'maxWeight') {
    goal = `${formatNumber(theirs)} kg`
  } else {
    const reps = repsForGoal(blocks)
    if (reps !== undefined) {
      const step = exercise.weightStep ?? DEFAULT_WEIGHT_STEP
      goal = `${formatNumber(loadToReach(theirs, reps, step))} kg × ${goalReps(reps)}`
    }
  }

  return (
    <>
      {victory}
      <button type="button" className="rival" onClick={() => open(rival)}>
        <CharacterAvatar character={rival} size="sm" />
        <div className="rival__text">
          <div>
            Disputando com <strong>{rival.name}</strong>
          </div>
          <div>
            {formatMark(theirs, prova.unit)}
            {gap !== undefined && ` · faltam ${formatMark(gap, prova.unit)}`}
            {goal && (
              <>
                {' · '}
                <span className="rival__goal">para vencer: {goal}</span>
              </>
            )}
          </div>
        </div>
        <span className="chevron">›</span>
      </button>
    </>
  )
}
