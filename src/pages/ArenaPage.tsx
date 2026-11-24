import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getArena } from '../db/arena'
import { CHARACTERS, getProva } from '../db/characters'
import {
  formatMark,
  formatRatio,
  METRIC_LABEL,
  MIN_SHARED_PROVAS,
  RATIO_CAP,
  STRENGTH_METRIC,
  STRENGTH_WINDOW_DAYS,
  type CharacterResult,
} from '../lib/strength'
import { formatDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { CharacterAvatar } from '../components/CharacterAvatar'

/** "3 provas" · "1 prova". */
function provasLabel(count: number): string {
  return count === 1 ? '1 prova' : `${count} provas`
}

/**
 * A aba Arena: qual personagem você é pela média das provas, quem vem a
 * seguir, o ranking inteiro e as suas marcas de cada prova.
 */
export function ArenaPage() {
  const navigate = useNavigate()
  const arena = useLiveQuery(getArena, [])

  const header = (
    <PageHeader title="Arena" subtitle={`Últimos ${STRENGTH_WINDOW_DAYS} dias`} />
  )
  if (!arena) return header

  const { marks, standing } = arena
  const { ranked, unranked, you, next } = standing
  const openCharacter = (result: CharacterResult) =>
    navigate(`/arena/${result.character.id}`)

  const rankRow = (result: CharacterResult) => {
    const reached = result.ratio! >= 1
    return (
      <button
        key={result.character.id}
        type="button"
        className="list__item"
        onClick={() => openCharacter(result)}
      >
        <CharacterAvatar character={result.character} />
        <div className="list__main">
          <div className="list__name">{result.character.name}</div>
          <div className="list__meta">
            {result.character.game} · {provasLabel(result.shared.length)}
          </div>
        </div>
        <span className={reached ? 'list__value is-beaten' : 'list__value'}>
          {reached && '✓ '}
          {formatRatio(result.ratio!)}
        </span>
      </button>
    )
  }

  // O ranking vai do mais forte ao mais fraco; você entra onde a média cruza 100%.
  const ahead = ranked.filter((result) => result.ratio! < 1)
  const behind = ranked.filter((result) => result.ratio! >= 1)

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
            <CharacterAvatar character={you.character} size="lg" />
            <div className="eyebrow">Você é</div>
            <div className="card__title card__title--lg">{you.character.name}</div>
            <div className="card__meta">{you.character.game}</div>
            {you.character.feat && (
              <p className="arena-hero__feat">“{you.character.feat}”</p>
            )}
            <span className="chip chip--accent">
              {formatRatio(you.ratio!)} do que {you.character.name} aguenta ·{' '}
              {provasLabel(you.shared.length)}
            </span>
            <button
              type="button"
              className="link-btn"
              onClick={() => openCharacter(you)}
            >
              Ver prova a prova
            </button>
          </section>
        ) : next ? (
          <section className="card arena-hero">
            <CharacterAvatar character={next.character} size="lg" />
            <div className="card__title">Você ainda não alcançou ninguém</div>
            <p className="hint" style={{ margin: 0 }}>
              O mais perto é <strong>{next.character.name}</strong>: em média, você
              aguenta {formatRatio(next.ratio!)} do que {next.character.name} aguenta.
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
            <button
              type="button"
              className="card-button"
              onClick={() => openCharacter(next)}
            >
              <div className="row">
                <CharacterAvatar character={next.character} />
                <div className="list__main">
                  <div className="list__name">{next.character.name}</div>
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

        {ranked.length > 0 && (
          <>
            <h2 className="section-title">Ranking</h2>
            <div className="list">
              {ahead.map(rankRow)}
              <div className="list__item list__item--you">
                <span className="avatar avatar--md avatar--you" aria-hidden="true">
                  💪
                </span>
                <div className="list__main">
                  <div className="list__name">Você</div>
                  <div className="list__meta">
                    {behind.length === 0
                      ? 'ainda atrás de todos'
                      : ahead.length === 0
                        ? 'no topo do ranking'
                        : `à frente de ${behind.length}`}
                  </div>
                </div>
              </div>
              {behind.map(rankRow)}
            </div>
            <p className="hint">
              A porcentagem é a média de quanto você aguenta do que o personagem aguenta,
              prova a prova (cada uma conta no máximo {formatRatio(RATIO_CAP)}).
            </p>
          </>
        )}

        {unranked.length > 0 && (
          <>
            <h2 className="section-title">Sem provas em comum suficientes</h2>
            <div className="list">
              {unranked.map((result) => (
                <button
                  key={result.character.id}
                  type="button"
                  className="list__item"
                  onClick={() => openCharacter(result)}
                >
                  <CharacterAvatar character={result.character} />
                  <div className="list__main">
                    <div className="list__name">{result.character.name}</div>
                    <div className="list__meta">
                      Disputa:{' '}
                      {Object.keys(result.character.loads)
                        .map((id) => getProva(id)?.name)
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  </div>
                  <span className="chevron">›</span>
                </button>
              ))}
            </div>
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
