import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getArena } from '../db/arena'
import { CHARACTERS, levelName, rungName, type Rung } from '../db/characters'
import {
  formatMark,
  formatRatio,
  METRIC_LABEL,
  MIN_SHARED_PROVAS,
  RATIO_CAP,
  STRENGTH_METRIC,
  STRENGTH_WINDOW_DAYS,
  type CharacterSummary,
} from '../lib/strength'
import { formatDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { CharacterAvatar } from '../components/CharacterAvatar'

/** "3 provas" · "1 prova". */
function provasLabel(count: number): string {
  return count === 1 ? '1 prova' : `${count} provas`
}

/**
 * A linha do personagem na lista: em que nível você está e quanto falta para
 * o próximo. Sem níveis, a porcentagem da média, como num degrau só.
 */
function summaryText(summary: CharacterSummary): { meta: string; value: string; done: boolean } {
  const { reached, next, results } = summary
  const leveled = results.some((result) => result.rung.level !== undefined)

  if (!leveled) {
    const only = results[0]
    if (only?.ratio === undefined) {
      return { meta: 'Sem provas em comum suficientes', value: '—', done: false }
    }
    return {
      meta: `${summary.character.game} · ${provasLabel(only.shared.length)}`,
      value: `${only.ratio >= 1 ? '✓ ' : ''}${formatRatio(only.ratio)}`,
      done: only.ratio >= 1,
    }
  }

  const parts: string[] = []
  if (reached) parts.push(`${levelName(reached.rung)} ✓`)
  if (next) parts.push(`${levelName(next.rung)}: ${formatRatio(next.ratio!)}`)
  if (parts.length === 0) parts.push('Sem provas em comum suficientes')

  return {
    meta: parts.join(' · '),
    value: next ? formatRatio(next.ratio!) : reached ? '✓' : '—',
    done: !!reached && !next,
  }
}

/**
 * A aba Arena: qual personagem (e nível) você é pela média das provas, quem
 * vem a seguir, cada personagem com os níveis alcançados e as suas marcas.
 */
export function ArenaPage() {
  const navigate = useNavigate()
  const arena = useLiveQuery(getArena, [])

  const header = (
    <PageHeader title="Arena" subtitle={`Últimos ${STRENGTH_WINDOW_DAYS} dias`} />
  )
  if (!arena) return header

  const { marks, standing } = arena
  const { you, next } = standing
  const openRung = (rung: Rung) =>
    navigate(`/arena/${rung.character.id}`, { state: { level: rung.level } })

  return (
    <>
      {header}

      <div className="page">
        {CHARACTERS.length === 0 ? (
          <section className="card arena-hero">
            <div className="arena-hero__icon" aria-hidden="true">
              🏟️
            </div>
            <div className="card__title">Personagens a caminho</div>
            <p className="hint" style={{ margin: 0 }}>
              O elenco ainda não chegou. Enquanto isso, ligue seus exercícios às provas —
              suas marcas já aparecem aqui embaixo.
            </p>
          </section>
        ) : you ? (
          <section className="card card--next arena-hero">
            <CharacterAvatar character={you.rung.character} size="lg" />
            <div className="eyebrow">Você é</div>
            <div className="card__title card__title--lg">{you.rung.character.name}</div>
            {levelName(you.rung) && (
              <span className="chip chip--accent">{levelName(you.rung)}</span>
            )}
            <div className="card__meta">{you.rung.character.game}</div>
            {you.rung.character.feat && (
              <p className="arena-hero__feat">“{you.rung.character.feat}”</p>
            )}
            <span className="hint">
              Em média você aguenta {formatRatio(you.ratio!)} do que {rungName(you.rung)}{' '}
              aguenta · {provasLabel(you.shared.length)}
            </span>
            <button type="button" className="link-btn" onClick={() => openRung(you.rung)}>
              Ver prova a prova
            </button>
          </section>
        ) : next ? (
          <section className="card arena-hero">
            <CharacterAvatar character={next.rung.character} size="lg" />
            <div className="card__title">Você ainda não alcançou ninguém</div>
            <p className="hint" style={{ margin: 0 }}>
              O mais perto é <strong>{rungName(next.rung)}</strong>: em média, você aguenta{' '}
              {formatRatio(next.ratio!)} do que esse personagem aguenta.
            </p>
          </section>
        ) : (
          <section className="card arena-hero">
            <div className="arena-hero__icon" aria-hidden="true">
              🥊
            </div>
            <div className="card__title">Ainda sem disputa</div>
            <p className="hint" style={{ margin: 0 }}>
              Para entrar na média você precisa de séries em pelo menos{' '}
              {MIN_SHARED_PROVAS} provas que os personagens também tenham.
            </p>
          </section>
        )}

        {you && next && (
          <>
            <h2 className="section-title">Próximo</h2>
            <button type="button" className="card-button" onClick={() => openRung(next.rung)}>
              <div className="row">
                <CharacterAvatar character={next.rung.character} />
                <div className="list__main">
                  <div className="list__name">{rungName(next.rung)}</div>
                  <div className="list__meta">
                    Você está em {formatRatio(next.ratio!)} · faltam{' '}
                    {formatRatio(1 - next.ratio!)}
                  </div>
                </div>
              </div>
              <div className="progress" style={{ marginTop: 10 }}>
                <div
                  className="progress__fill"
                  style={{ width: `${Math.round(next.ratio! * 100)}%` }}
                />
              </div>
            </button>
          </>
        )}

        {standing.characters.length > 0 && (
          <>
            <h2 className="section-title">Personagens</h2>
            <div className="list">
              {standing.characters.map((summary) => {
                const { meta, value, done } = summaryText(summary)
                const leveled = summary.results.some((r) => r.rung.level !== undefined)
                const target = summary.next ?? summary.reached ?? summary.results[0]
                return (
                  <button
                    key={summary.character.id}
                    type="button"
                    className="list__item"
                    onClick={() =>
                      navigate(`/arena/${summary.character.id}`, {
                        state: { level: target?.rung.level },
                      })
                    }
                  >
                    <CharacterAvatar character={summary.character} />
                    <div className="list__main">
                      <div className="list__name">{summary.character.name}</div>
                      <div className="list__meta">{meta}</div>
                      {leveled && (
                        <div className="level-pips" aria-hidden="true">
                          {summary.results.map((result) => (
                            <span
                              key={result.rung.key}
                              className={
                                result.ratio !== undefined && result.ratio >= 1
                                  ? 'level-pip is-reached'
                                  : result === summary.next
                                    ? 'level-pip is-next'
                                    : 'level-pip'
                              }
                            >
                              {result.rung.level}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={done ? 'list__value is-beaten' : 'list__value'}>
                      {value}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="hint">
              A porcentagem é a média de quanto você aguenta do que o personagem aguenta
              naquele nível, prova a prova (cada uma conta no máximo{' '}
              {formatRatio(RATIO_CAP)}).
            </p>
          </>
        )}

        <h2 className="section-title">Suas marcas</h2>
        {marks.length === 0 ? (
          <p className="hint" style={{ marginTop: 0 }}>
            Nenhum exercício ligado a uma prova. Em <strong>Exercícios</strong>, abra um
            exercício e toque em <strong>Editar → Prova da Arena</strong>.
          </p>
        ) : (
          <>
            <div className="list">
              {marks.map(({ prova, exercises, mark }) => {
                const source =
                  exercises.find((exercise) => exercise.id === mark?.exerciseId) ??
                  exercises.find((exercise) => exercise.archived === 0) ??
                  exercises[0]!
                return (
                  <button
                    key={prova.id}
                    type="button"
                    className="list__item"
                    onClick={() =>
                      navigate(`/exercicios/${source.id}`, {
                        state: { from: '/arena', label: 'Arena' },
                      })
                    }
                  >
                    <div className="list__main">
                      <div className="list__name">{prova.name}</div>
                      <div className="list__meta">
                        {mark
                          ? `${source.name} · ${formatDate(mark.at)}`
                          : `${exercises.map((e) => e.name).join(', ')} · sem séries no período`}
                      </div>
                    </div>
                    <span className="list__value">
                      {mark ? formatMark(mark.value, prova.unit) : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="hint">
              Melhor série de cada prova nos últimos {STRENGTH_WINDOW_DAYS} dias, em{' '}
              {METRIC_LABEL[STRENGTH_METRIC]}. Com duas máquinas na mesma prova, vale a
              melhor.
            </p>
          </>
        )}
      </div>
    </>
  )
}
