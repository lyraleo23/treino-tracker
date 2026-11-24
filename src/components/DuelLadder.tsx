import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Exercise } from '../db/db'
import { getExerciseDuel } from '../db/arena'
import type { Character } from '../db/characters'
import {
  formatMark,
  loadOf,
  METRIC_LABEL,
  STRENGTH_METRIC,
  STRENGTH_WINDOW_DAYS,
} from '../lib/strength'
import { formatDate } from '../lib/format'
import { CharacterAvatar } from './CharacterAvatar'

interface Props {
  exercise: Exercise
}

/**
 * A escada da prova na tela do exercício: quem está na frente, você, e quem
 * já ficou para trás — com a data em que cada um caiu.
 */
export function DuelLadder({ exercise }: Props) {
  const navigate = useNavigate()
  const result = useLiveQuery(() => getExerciseDuel(exercise.id), [exercise.id, exercise.prova])

  // Aeróbico não tem prova; sem prova ligada, só o convite para ligar.
  if (exercise.kind === 'cardio' || result === undefined) return null

  if (result === null) {
    return (
      <>
        <h2 className="section-title">Arena</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Ligue este exercício a uma prova (<strong>Editar → Prova da Arena</strong>) para
          disputar com os personagens.
        </p>
      </>
    )
  }

  const { prova, mark, duel, beatenAt } = result
  const contenders = duel.beaten.length + duel.ahead.length

  const row = (character: Character, beaten: boolean) => (
    <button
      key={character.id}
      type="button"
      className="list__item"
      onClick={() =>
        navigate(`/arena/${character.id}`, {
          state: { from: `/exercicios/${exercise.id}`, label: exercise.name },
        })
      }
    >
      <CharacterAvatar character={character} />
      <div className="list__main">
        <div className="list__name">{character.name}</div>
        <div className="list__meta">
          {beaten
            ? `vencido em ${formatDate(beatenAt[character.id] ?? Date.now())}`
            : character === duel.rival
              ? 'seu rival'
              : character.game}
        </div>
      </div>
      <span className={beaten ? 'list__value is-beaten' : 'list__value'}>
        {beaten && '✓ '}
        {formatMark(loadOf(character, prova.id)!, prova.unit)}
      </span>
    </button>
  )

  return (
    <>
      <h2 className="section-title">Arena · {prova.name}</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        {mark
          ? `Sua marca: ${formatMark(mark.value, prova.unit)}`
          : 'Nenhuma série que conte'}
        {prova.unit === 'kg' && ` (${METRIC_LABEL[STRENGTH_METRIC]})`} nos últimos{' '}
        {STRENGTH_WINDOW_DAYS} dias.
      </p>

      {contenders === 0 ? (
        <p className="hint">Nenhum personagem disputa {prova.inPhrase} ainda.</p>
      ) : (
        <div className="list">
          {/* Do mais forte para o mais fraco, como um placar: você no meio. */}
          {[...duel.ahead].reverse().map((character) => row(character, false))}
          <div className="list__item list__item--you">
            <span className="avatar avatar--md avatar--you" aria-hidden="true">
              💪
            </span>
            <div className="list__main">
              <div className="list__name">Você</div>
              <div className="list__meta">
                {duel.ahead.length === 0
                  ? 'no topo da escada'
                  : duel.beaten.length === 0
                    ? 'nenhum vencido ainda'
                    : duel.beaten.length === 1
                      ? '1 vencido'
                      : `${duel.beaten.length} vencidos`}
              </div>
            </div>
            <span className="list__value">
              {mark ? formatMark(mark.value, prova.unit) : '—'}
            </span>
          </div>
          {[...duel.beaten].reverse().map((character) => row(character, true))}
        </div>
      )}
    </>
  )
}
