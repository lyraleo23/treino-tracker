import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DrinkLog } from '../db/db'
import { logDrink } from '../db/actions'
import { getDayHydration, getHydrationHistory } from '../db/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { DrinkLogModal } from '../components/DrinkLogModal'
import { CheckIcon } from '../components/icons'
import { formatMl, formatWeekday, startOfDay } from '../lib/format'

export function HealthPage() {
  const navigate = useNavigate()
  const [editing, setEditing] = useState<DrinkLog | null>(null)

  const data = useLiveQuery(async () => {
    const hoje = startOfDay(Date.now())
    const [dia, historico, drinks, containers, shortcuts] = await Promise.all([
      getDayHydration(hoje),
      getHydrationHistory(7),
      db.drinks.filter((d) => d.archived === 0).sortBy('order'),
      db.containers.filter((c) => c.archived === 0).sortBy('order'),
      db.drinkShortcuts.orderBy('order').toArray(),
    ])

    const drinkById = new Map(drinks.map((d) => [d.id, d]))
    const containerById = new Map(containers.map((c) => [c.id, c]))

    return {
      dia,
      // O dia de hoje é o último do histórico; na faixa ele já aparece.
      historico,
      drinks,
      drinkById,
      atalhos: shortcuts
        .map((s) => ({
          shortcut: s,
          drink: drinkById.get(s.drinkId),
          container: containerById.get(s.containerId),
        }))
        .filter((a) => a.drink && a.container),
    }
  }, [])

  if (!data) return <div className="page" />

  const { dia, historico, drinkById, atalhos } = data
  const progresso = Math.min(100, Math.round((dia.countedMl / dia.goalMl) * 100))

  return (
    <>
      <PageHeader
        title="Saúde"
        subtitle="Hidratação de hoje"
        action={
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => navigate('/saude/hidratacao')}
          >
            Ajustar
          </button>
        }
      />

      <div className="page">
        <div className="card">
          <div className="row row--between">
            <div style={{ minWidth: 0 }}>
              <div className="card__title">
                {formatMl(dia.countedMl)} de {formatMl(dia.goalMl)}
              </div>
              {/* A segunda linha só aparece quando algum fator mordeu: sem
                  isso o caso comum (só água) ganharia ruído à toa. */}
              {dia.hasFactor && (
                <div className="card__meta">
                  bebeu {formatMl(dia.drunkMl)} · conta {formatMl(dia.countedMl)}
                </div>
              )}
            </div>
            {dia.hit && (
              <span className="chip chip--accent">
                <CheckIcon width={14} height={14} /> meta batida
              </span>
            )}
          </div>

          <div className="progress" style={{ marginTop: 10 }}>
            <div
              className={dia.hit ? 'progress__fill is-done' : 'progress__fill'}
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        <h2 className="section-title">Registrar</h2>
        {atalhos.length === 0 ? (
          <EmptyState
            icon="🥤"
            title="Nenhum atalho ainda"
            description="Monte combinações de bebida e recipiente para registrar com um toque."
            action={
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate('/saude/hidratacao')}
              >
                Criar atalhos
              </button>
            }
          />
        ) : (
          <div className="chip-grid">
            {atalhos.map(({ shortcut, drink, container }) => (
              <button
                key={shortcut.id}
                type="button"
                className="chip-option"
                onClick={() =>
                  void logDrink({ drinkId: drink!.id, ml: container!.ml })
                }
              >
                {drink!.name} · {container!.name} {container!.ml}ml
              </button>
            ))}
          </div>
        )}

        <h2 className="section-title">Hoje</h2>
        {dia.logs.length === 0 ? (
          <p className="hint">Nada registrado ainda.</p>
        ) : (
          <div className="list">
            {dia.logs.map((log) => {
              const drink = drinkById.get(log.drinkId)
              return (
                <button
                  key={log.id}
                  type="button"
                  className="list__item"
                  onClick={() => setEditing(log)}
                >
                  <div className="list__main">
                    <div className="list__name">
                      {drink?.name ?? 'Bebida removida'}
                    </div>
                    <div className="list__meta">
                      {formatMl(log.ml)}
                      {log.countedMl !== log.ml && ` · conta ${formatMl(log.countedMl)}`}
                    </div>
                  </div>
                  <span className="chevron">›</span>
                </button>
              )
            })}
          </div>
        )}

        <h2 className="section-title">Últimos dias</h2>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {historico.map((d) => (
            <div
              key={d.day}
              className="card card--tight"
              style={{ flex: '1 1 0', minWidth: 42, textAlign: 'center', padding: 8 }}
            >
              <div className="stat__label">{formatWeekday(d.day)}</div>
              <div style={{ fontSize: 18, marginTop: 2 }}>{d.hit ? '💧' : '·'}</div>
            </div>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 6 }}>
          A gota marca os dias em que a meta foi batida. Cada dia guarda a meta que
          valia nele, então mudar a meta agora não reescreve o passado.
        </p>

        <h2 className="section-title">Nutrição</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Em breve.
        </p>
      </div>

      {editing && (
        <DrinkLogModal
          log={editing}
          drinks={data.drinks}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
