import { useState } from 'react'
import type { Food, MealLog, MealLogItem } from '../db/db'
import { deleteMealLog, updateMealLog } from '../db/actions'
import { Modal } from './Modal'
import { computeItemNutrition, sumNutrition } from '../lib/nutrition'
import { formatGrams, formatKcal, parseNumber } from '../lib/format'

interface Props {
  mealLog: MealLog
  items: MealLogItem[]
  foods: Food[]
  onClose: () => void
}

/** Corrige um registro do dia: ajustar quantidades já lançadas, ou apagar. */
export function MealLogEditModal({ mealLog, items, foods, onClose }: Props) {
  const foodById = new Map(foods.map((f) => [f.id, f]))
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.id, String(item.quantity)])),
  )

  const parsedByItem = new Map(
    items.map((item) => [item.id, parseNumber(quantities[item.id] ?? '') ?? 0]),
  )

  const computed = items.map((item) =>
    computeItemNutrition(foodById.get(item.foodId), parsedByItem.get(item.id) ?? 0, item.unit),
  )
  const summary = sumNutrition(computed)
  const hasEntries = items.some((item) => (parsedByItem.get(item.id) ?? 0) > 0)

  return (
    <Modal
      title="Editar registro"
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            className="btn btn--ghost btn--danger"
            onClick={async () => {
              await deleteMealLog(mealLog.id)
              onClose()
            }}
          >
            Apagar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!hasEntries}
            onClick={async () => {
              await updateMealLog(
                mealLog.id,
                items.map((item) => ({
                  foodId: item.foodId,
                  quantity: parsedByItem.get(item.id) ?? 0,
                  unit: item.unit,
                })),
              )
              onClose()
            }}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="stack">
        {items.map((item) => {
          const food = foodById.get(item.foodId)
          return (
            <div key={item.id} className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="list__name">{food?.name ?? 'Alimento removido'}</div>
              </div>
              <input
                className="input input--center"
                style={{ width: 72 }}
                inputMode="decimal"
                value={quantities[item.id] ?? String(item.quantity)}
                onChange={(event) =>
                  setQuantities({ ...quantities, [item.id]: event.target.value })
                }
              />
              <span className="hint" style={{ minWidth: 40 }}>{item.unit}</span>
            </div>
          )
        })}

        <div className="hint">
          {formatKcal(summary.calories)} · {formatGrams(summary.proteinG)} proteína ·{' '}
          {formatGrams(summary.carbsG)} carb · {formatGrams(summary.fatG)} gordura
        </div>
      </div>
    </Modal>
  )
}
