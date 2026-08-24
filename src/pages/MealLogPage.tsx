import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DietIngredient, type DietOption } from '../db/db'
import { logMeal } from '../db/actions'
import { PageHeader } from '../components/PageHeader'
import { computeItemNutrition, sumNutrition } from '../lib/nutrition'
import { DIET_CATEGORY_LABELS, formatGrams, formatKcal, parseNumber } from '../lib/format'
import { VEGETABLES_UNLIMITED } from '../db/dietSeed'

interface Row {
  key: string
  foodId: string
  unit: string
  defaultQuantity: number
  isAlternative: boolean
}

function rowsFor(option: DietOption): Row[] {
  const fromIngredients = (list: DietIngredient[] | undefined, prefix: string, isAlternative: boolean): Row[] =>
    (list ?? []).map((ing, i) => ({
      key: `${option.id}-${prefix}-${i}`,
      foodId: ing.foodId,
      unit: ing.unit,
      defaultQuantity: isAlternative ? 0 : ing.quantity,
      isAlternative,
    }))

  return [
    ...fromIngredients(option.ingredients, 'ing', false),
    ...fromIngredients(option.alternativeIngredients, 'alt', true),
  ]
}

export function MealLogPage() {
  const { mealId } = useParams<{ mealId: string }>()
  const navigate = useNavigate()

  const [selected, setSelected] = useState<Record<string, string>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})

  const data = useLiveQuery(async () => {
    if (!mealId) return undefined
    const [meal, options, foods] = await Promise.all([
      db.dietMeals.get(mealId),
      db.dietOptions.where('mealId').equals(mealId).sortBy('order'),
      db.foods.toArray(),
    ])
    if (!meal) return undefined

    const byCategory = new Map<string, DietOption[]>()
    for (const option of options) {
      const list = byCategory.get(option.category) ?? []
      list.push(option)
      byCategory.set(option.category, list)
    }

    const foodById = new Map(foods.map((f) => [f.id, f]))
    return { meal, byCategory, foodById }
  }, [mealId])

  if (!data) return <div className="page" />

  const { meal, byCategory, foodById } = data
  const categories = Object.keys(meal.selectionRules)
  const allChosen = categories.every((category) => !!selected[category])

  const chosenOptions = categories
    .map((category) => {
      const optionId = selected[category]
      return byCategory.get(category)?.find((o) => o.id === optionId)
    })
    .filter((o): o is DietOption => !!o)

  const rows = chosenOptions.flatMap(rowsFor)

  const parsedByKey = new Map<string, number>()
  for (const row of rows) {
    const raw = quantities[row.key] ?? String(row.defaultQuantity)
    const parsed = parseNumber(raw)
    parsedByKey.set(row.key, parsed ?? 0)
  }

  const computedByKey = new Map(
    rows.map((row) => [
      row.key,
      computeItemNutrition(foodById.get(row.foodId), parsedByKey.get(row.key) ?? 0, row.unit),
    ]),
  )
  const summary = sumNutrition([...computedByKey.values()])
  const hasEntries = rows.some((row) => (parsedByKey.get(row.key) ?? 0) > 0)

  const showVegetables = meal.optionalSides?.includes('vegetables_unlimited')

  async function handleSave() {
    const items = rows.map((row) => ({
      foodId: row.foodId,
      quantity: parsedByKey.get(row.key) ?? 0,
      unit: row.unit,
    }))
    await logMeal({ mealId: meal.id, items })
    navigate('/saude')
  }

  return (
    <>
      <PageHeader title={meal.name} back backTo="/saude" backLabel="Saúde" />

      <div className="page">
        {categories.map((category) => {
          const options = byCategory.get(category) ?? []
          const label = DIET_CATEGORY_LABELS[category] ?? category
          return (
            <div className="field" key={category}>
              <span className="field__label">{label}</span>
              <div className="chip-grid">
                {options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={selected[category] === option.id ? 'chip-option is-active' : 'chip-option'}
                    onClick={() => setSelected({ ...selected, [category]: option.id })}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {!allChosen && (
          <p className="hint">Escolha uma opção de cada categoria para ver os ingredientes.</p>
        )}

        {allChosen && (
          <>
            {chosenOptions.some((o) => o.alternativeLogic || o.notes || o.preparation) && (
              <div className="stack" style={{ marginBottom: 12 }}>
                {chosenOptions.map((option) => (
                  <div key={option.id}>
                    {option.alternativeLogic && <p className="hint" style={{ margin: 0 }}>{option.alternativeLogic}</p>}
                    {option.notes?.map((note, i) => (
                      <p className="hint" key={i} style={{ margin: 0 }}>{note}</p>
                    ))}
                    {option.preparation && <p className="hint" style={{ margin: 0 }}>{option.preparation}</p>}
                  </div>
                ))}
              </div>
            )}

            <h2 className="section-title">Ingredientes</h2>
            <div className="list">
              {rows.map((row) => {
                const food = foodById.get(row.foodId)
                const computed = computedByKey.get(row.key)
                return (
                  <div key={row.key} className="list__item">
                    <div className="list__main">
                      <div
                        className="list__name"
                        style={row.isAlternative ? { color: 'var(--text-dim)' } : undefined}
                      >
                        {food?.name ?? 'Alimento removido'}
                        {row.isAlternative && ' (alternativa)'}
                      </div>
                      <div className="list__meta">
                        {computed?.known ? formatKcal(computed.calories) : 'estimativa indisponível'}
                      </div>
                    </div>
                    <input
                      className="input input--center"
                      style={{ width: 72 }}
                      inputMode="decimal"
                      value={quantities[row.key] ?? String(row.defaultQuantity)}
                      onChange={(event) =>
                        setQuantities({ ...quantities, [row.key]: event.target.value })
                      }
                    />
                    <span className="hint" style={{ minWidth: 40 }}>{row.unit}</span>
                  </div>
                )
              })}
            </div>

            {showVegetables && (
              <p className="hint">
                À vontade: {VEGETABLES_UNLIMITED.join(', ')}. Não conta calorias.
              </p>
            )}

            <h2 className="section-title">Resumo</h2>
            <div className="card">
              <div className="card__title">{formatKcal(summary.calories)}</div>
              <div className="card__meta">
                {formatGrams(summary.proteinG)} proteína · {formatGrams(summary.carbsG)} carb ·{' '}
                {formatGrams(summary.fatG)} gordura
              </div>
              {!summary.known && (
                <div className="card__meta">Alguns itens não têm nutrição conhecida.</div>
              )}
            </div>

            <button
              type="button"
              className="btn btn--primary btn--block"
              style={{ marginTop: 12 }}
              disabled={!hasEntries}
              onClick={() => void handleSave()}
            >
              Salvar
            </button>
          </>
        )}
      </div>
    </>
  )
}
