import { useState } from 'react'
import { saveNutritionGoal } from '../db/actions'
import { Modal } from './Modal'
import { parseNumber } from '../lib/format'

interface Props {
  kcalMin: number
  kcalMax: number
  proteinG: number
  carbsG: number
  fatG: number
  onClose: () => void
}

export function NutritionGoalModal({
  kcalMin,
  kcalMax,
  proteinG,
  carbsG,
  fatG,
  onClose,
}: Props) {
  const [min, setMin] = useState(String(kcalMin))
  const [max, setMax] = useState(String(kcalMax))
  const [protein, setProtein] = useState(String(proteinG))
  const [carbs, setCarbs] = useState(String(carbsG))
  const [fat, setFat] = useState(String(fatG))

  const parsedMin = parseNumber(min)
  const parsedMax = parseNumber(max)
  const parsedProtein = parseNumber(protein)
  const parsedCarbs = parseNumber(carbs)
  const parsedFat = parseNumber(fat)

  const kcalInvalido =
    parsedMin === undefined ||
    parsedMax === undefined ||
    parsedMin < 500 ||
    parsedMin > parsedMax
  const proteinInvalido = parsedProtein === undefined || parsedProtein < 1
  const carbsInvalido = parsedCarbs === undefined || parsedCarbs < 1
  const fatInvalido = parsedFat === undefined || parsedFat < 1
  const invalido = kcalInvalido || proteinInvalido || carbsInvalido || fatInvalido

  return (
    <Modal
      title="Metas de nutrição"
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
              await saveNutritionGoal({
                kcalMin: parsedMin!,
                kcalMax: parsedMax!,
                proteinG: parsedProtein!,
                carbsG: parsedCarbs!,
                fatG: parsedFat!,
              })
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
        {/* A proteína é piso, não faixa: um campo só, e passar dele é bom. */}
        <div className="field">
          <label className="field__label" htmlFor="protein-goal">
            Proteína (g por dia, no mínimo)
          </label>
          <input
            id="protein-goal"
            className="input input--center"
            inputMode="numeric"
            value={protein}
            onChange={(event) => setProtein(event.target.value)}
          />
        </div>
        {/* Carboidrato e gordura são alvo, não piso: a dieta prescreve um total,
            e tanto ficar aquém quanto passar são desvios dele. */}
        <div className="field">
          <label className="field__label" htmlFor="carbs-goal">
            Carboidrato (g por dia)
          </label>
          <input
            id="carbs-goal"
            className="input input--center"
            inputMode="numeric"
            value={carbs}
            onChange={(event) => setCarbs(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="fat-goal">
            Gordura (g por dia)
          </label>
          <input
            id="fat-goal"
            className="input input--center"
            inputMode="numeric"
            value={fat}
            onChange={(event) => setFat(event.target.value)}
          />
        </div>
        {kcalInvalido && (
          <span className="hint">
            O mínimo de kcal precisa ser pelo menos 500 e não pode passar do máximo.
          </span>
        )}
        {proteinInvalido && (
          <span className="hint">A meta de proteína precisa ser de pelo menos 1 g.</span>
        )}
        {carbsInvalido && (
          <span className="hint">A meta de carboidrato precisa ser de pelo menos 1 g.</span>
        )}
        {fatInvalido && (
          <span className="hint">A meta de gordura precisa ser de pelo menos 1 g.</span>
        )}
      </div>
    </Modal>
  )
}
