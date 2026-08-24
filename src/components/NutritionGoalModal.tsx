import { useState } from 'react'
import { saveNutritionGoal } from '../db/actions'
import { Modal } from './Modal'
import { parseNumber } from '../lib/format'

interface Props {
  kcalMin: number
  kcalMax: number
  onClose: () => void
}

export function NutritionGoalModal({ kcalMin, kcalMax, onClose }: Props) {
  const [min, setMin] = useState(String(kcalMin))
  const [max, setMax] = useState(String(kcalMax))

  const parsedMin = parseNumber(min)
  const parsedMax = parseNumber(max)
  const invalido =
    parsedMin === undefined ||
    parsedMax === undefined ||
    parsedMin < 500 ||
    parsedMin > parsedMax

  return (
    <Modal
      title="Meta de calorias"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={invalido}
            onClick={async () => {
              await saveNutritionGoal(parsedMin!, parsedMax!)
              onClose()
            }}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="kcal-min">
            Mínimo (kcal)
          </label>
          <input
            id="kcal-min"
            className="input input--center"
            inputMode="numeric"
            value={min}
            onChange={(event) => setMin(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="kcal-max">
            Máximo (kcal)
          </label>
          <input
            id="kcal-max"
            className="input input--center"
            inputMode="numeric"
            value={max}
            onChange={(event) => setMax(event.target.value)}
          />
        </div>
        {invalido && <span className="hint">O mínimo precisa ser pelo menos 500 e não pode passar do máximo.</span>}
      </div>
    </Modal>
  )
}
