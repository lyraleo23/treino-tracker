import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Exercise } from '../db/db'
import { getExerciseDuel } from '../db/arena'
import { isProvaVisible, levelName, PROVAS, type Rung } from '../db/characters'
import { getArenaSettings } from '../db/queries'
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
  const settings = useLiveQuery(getArenaSettings, [])

  // Aeróbico não tem prova; sem prova ligada, só o convite para ligar.
  if (exercise.kind === 'cardio' || result === undefined || !settings) return null
  const show = settings.showUndisputedProvas

  if (result === null) {
    // Convidar a ligar só faz sentido se houver prova visível para este tipo
    // de exercício — com tempo, por exemplo, hoje só existe a prancha.
    const unit = exercise.kind === 'time' ? 's' : 'kg'
    const hasVisibleProva = PROVAS.some(
      (prova) => prova.unit === unit && isProvaVisible(prova.id, show),
    )
    if (!hasVisibleProva) return null
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
  // Prova sem personagem: a seção só diria "ninguém disputa".
  if (contenders === 0 && !show) return null

  const row = (rung: Rung, beaten: boolean) => {
    const level = levelName(rung)
    const status = beaten
      ? `vencido em ${formatDate(beatenAt[rung.key] ?? Date.now())}`
      : rung === duel.rival
        ? 'seu rival'
        : rung.character.game
    return (
      <button
        key={rung.key}
        type="button"
        className="list__item"
        onClick={() =>
          navigate(`/arena/${rung.character.id}`, {
            state: { from: `/exercicios/${exercise.id}`, label: exercise.name, level: rung.level },
          })
        }
      >
        <CharacterAvatar character={rung.character} />
        <div className="list__main">
          <div className="list__name">{rung.character.name}</div>
          <div className="list__meta">{level ? `${level} · ${status}` : status}</div>
        </div>
        <span className={beaten ? 'list__value is-beaten' : 'list__value'}>
          {beaten && '✓ '}
          {formatMark(loadOf(rung, prova.id)!, prova.unit)}
        </span>
      </button>
    )
  }

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
          {[...duel.ahead].reverse().map((rung) => row(rung, false))}
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
          {[...duel.beaten].reverse().map((rung) => row(rung, true))}
        </div>
      )}
    </>
  )
}
