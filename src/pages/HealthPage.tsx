import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DrinkLog, type MealLog } from '../db/db'
import { logDrink } from '../db/actions'
import { getDayHydration, getDayNutrition, getHydrationHistory, getNutritionHistory } from '../db/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { DrinkLogModal } from '../components/DrinkLogModal'
import { MealLogEditModal } from '../components/MealLogEditModal'
import { NutritionGoalModal } from '../components/NutritionGoalModal'
import { CheckIcon } from '../components/icons'
import { formatKcal, formatMl, formatNumber, formatTime, formatWeekday, startOfDay } from '../lib/format'

export function HealthPage() {
  const navigate = useNavigate()
  const [editing, setEditing] = useState<DrinkLog | null>(null)
  const [editingMeal, setEditingMeal] = useState<MealLog | null>(null)
  const [goalOpen, setGoalOpen] = useState(false)

  const data = useLiveQuery(async () => {
    const hoje = startOfDay(Date.now())
    const [dia, historico, drinks, containers, shortcuts, diaNutricao, historicoNutricao, meals, foods] =
      await Promise.all([
        getDayHydration(hoje),
        getHydrationHistory(7),
        db.drinks.filter((d) => d.archived === 0).sortBy('order'),
        db.containers.filter((c) => c.archived === 0).sortBy('order'),
        db.drinkShortcuts.orderBy('order').toArray(),
        getDayNutrition(hoje),
        getNutritionHistory(7),
        db.dietMeals.orderBy('order').toArray(),
        db.foods.toArray(),
      ])

    const drinkById = new Map(drinks.map((d) => [d.id, d]))
    const containerById = new Map(containers.map((c) => [c.id, c]))
    const foodById = new Map(foods.map((f) => [f.id, f]))

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
      diaNutricao,
      historicoNutricao,
      meals,
      foods,
      foodById,
    }
  }, [])

  if (!data) return <div className="page" />

  const { dia, historico, drinkById, atalhos, diaNutricao, historicoNutricao, meals, foods } = data
  const progresso = Math.min(100, Math.round((dia.countedMl / dia.goalMl) * 100))
  const progressoKcal = Math.min(
    100,
    diaNutricao.kcalMax > 0 ? Math.round((diaNutricao.totalCalories / diaNutricao.kcalMax) * 100) : 0,
  )
  const mealById = new Map(meals.map((m) => [m.id, m]))
  const kcalByMeal = new Map<string, number>()
  const countByMeal = new Map<string, number>()
  for (const log of diaNutricao.logs) {
    const items = diaNutricao.itemsByLog.get(log.id) ?? []
    const kcal = items.reduce((sum, item) => sum + item.calories, 0)
    kcalByMeal.set(log.mealId, (kcalByMeal.get(log.mealId) ?? 0) + kcal)
    countByMeal.set(log.mealId, (countByMeal.get(log.mealId) ?? 0) + 1)
  }

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
                      {formatTime(log.at)} · {formatMl(log.ml)}
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
          {historico.map((d) => {
            // Hoje fica neutro até o dia acabar: um ❌ às 8h da manhã soaria
            // como reprovação antes de qualquer chance real de beber os 2,5 l.
            const isHoje = d.day === startOfDay(Date.now())
            const icone = d.hit ? '💧' : isHoje ? '·' : '❌'
            return (
              <div
                key={d.day}
                className="card card--tight"
                style={{ flex: '1 1 0', minWidth: 42, textAlign: 'center', padding: 8 }}
              >
                <div className="stat__label">{formatWeekday(d.day)}</div>
                <div style={{ fontSize: 18, marginTop: 2 }}>{icone}</div>
              </div>
            )
          })}
        </div>
        <p className="hint" style={{ marginTop: 6 }}>
          💧 bateu a meta · ❌ não bateu · · hoje, ainda em andamento. Cada dia
          guarda a meta que valia nele, então mudar a meta agora não reescreve o
          passado.
        </p>

        <div className="row row--between" style={{ marginTop: 4 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Nutrição</h2>
          <button type="button" className="btn btn--sm" onClick={() => setGoalOpen(true)}>
            Ajustar meta
          </button>
        </div>

        <div className="card">
          <div className="row row--between">
            <div style={{ minWidth: 0 }}>
              <div className="card__title">
                {formatKcal(diaNutricao.totalCalories)} de {formatNumber(diaNutricao.kcalMin, 0)}–
                {formatKcal(diaNutricao.kcalMax)}
              </div>
              {diaNutricao.hasUnknown && (
                <div className="card__meta">alguns itens sem nutrição conhecida</div>
              )}
            </div>
            {diaNutricao.hit && (
              <span className="chip chip--accent">
                <CheckIcon width={14} height={14} /> dentro da meta
              </span>
            )}
            {diaNutricao.over && (
              <span className="chip chip--warn">acima da meta</span>
            )}
          </div>

          <div className="progress" style={{ marginTop: 10 }}>
            <div
              className={diaNutricao.hit ? 'progress__fill is-done' : 'progress__fill'}
              style={{ width: `${progressoKcal}%` }}
            />
          </div>
        </div>

        <h2 className="section-title">Refeições</h2>
        <div className="list">
          {meals.map((meal) => {
            const count = countByMeal.get(meal.id) ?? 0
            const kcal = kcalByMeal.get(meal.id) ?? 0
            return (
              <button
                key={meal.id}
                type="button"
                className="list__item"
                onClick={() => navigate(`/saude/refeicao/${meal.id}`)}
              >
                <div className="list__main">
                  <div className="list__name">{meal.name}</div>
                  <div className="list__meta">
                    {count === 0
                      ? 'Toque para registrar'
                      : `${count} ${count === 1 ? 'registro' : 'registros'} · ${formatKcal(kcal)}`}
                  </div>
                </div>
                <span className="chevron">›</span>
              </button>
            )
          })}
        </div>

        <h2 className="section-title">Hoje</h2>
        {diaNutricao.logs.length === 0 ? (
          <p className="hint">Nada registrado ainda.</p>
        ) : (
          <div className="list">
            {diaNutricao.logs.map((log) => {
              const items = diaNutricao.itemsByLog.get(log.id) ?? []
              const kcal = items.reduce((sum, item) => sum + item.calories, 0)
              return (
                <button
                  key={log.id}
                  type="button"
                  className="list__item"
                  onClick={() => setEditingMeal(log)}
                >
                  <div className="list__main">
                    <div className="list__name">
                      {mealById.get(log.mealId)?.name ?? 'Refeição removida'}
                    </div>
                    <div className="list__meta">
                      {formatTime(log.at)} · {formatKcal(kcal)}
                    </div>
                  </div>
                  <span className="chevron">›</span>
                </button>
              )
            })}
          </div>
        )}

        <h2 className="section-title">Últimos dias (nutrição)</h2>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {historicoNutricao.map((d) => {
            const isHoje = d.day === startOfDay(Date.now())
            const icone = d.hit ? '🍽️' : d.over ? '⚠️' : isHoje ? '·' : '❌'
            return (
              <div
                key={d.day}
                className="card card--tight"
                style={{ flex: '1 1 0', minWidth: 42, textAlign: 'center', padding: 8 }}
              >
                <div className="stat__label">{formatWeekday(d.day)}</div>
                <div style={{ fontSize: 18, marginTop: 2 }}>{icone}</div>
              </div>
            )
          })}
        </div>
        <p className="hint" style={{ marginTop: 6 }}>
          🍽️ dentro da meta · ⚠️ passou do máximo · ❌ não bateu o mínimo · · hoje,
          ainda em andamento.
        </p>
      </div>

      {editing && (
        <DrinkLogModal
          log={editing}
          drinks={data.drinks}
          onClose={() => setEditing(null)}
        />
      )}

      {editingMeal && (
        <MealLogEditModal
          mealLog={editingMeal}
          items={diaNutricao.itemsByLog.get(editingMeal.id) ?? []}
          foods={foods}
          onClose={() => setEditingMeal(null)}
        />
      )}

      {goalOpen && (
        <NutritionGoalModal
          kcalMin={diaNutricao.kcalMin}
          kcalMax={diaNutricao.kcalMax}
          onClose={() => setGoalOpen(false)}
        />
      )}
    </>
  )
}
