import { useState } from 'react'
import { saveNutritionGoal } from '../db/actions'
import { Modal } from './Modal'
import { parseNumber } from '../lib/format'

interface Props {
  kcalMin: number
  kcalMax: number
  proteinG: number
  onClose: () => void
}

export function NutritionGoalModal({ kcalMin, kcalMax, proteinG, onClose }: Props) {
  const [min, setMin] = useState(String(kcalMin))
  const [max, setMax] = useState(String(kcalMax))
  const [protein, setProtein] = useState(String(proteinG))

  const parsedMin = parseNumber(min)
  const parsedMax = parseNumber(max)
  const parsedProtein = parseNumber(protein)

  const kcalInvalido =
    parsedMin === undefined ||
    parsedMax === undefined ||
    parsedMin < 500 ||
    parsedMin > parsedMax
  const proteinInvalido = parsedProtein === undefined || parsedProtein < 1
  const invalido = kcalInvalido || proteinInvalido

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
              await saveNutritionGoal(parsedMin!, parsedMax!, parsedProtein!)
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
        {kcalInvalido && (
          <span className="hint">
            O mínimo de kcal precisa ser pelo menos 500 e não pode passar do máximo.
          </span>
        )}
        {proteinInvalido && (
          <span className="hint">A meta de proteína precisa ser de pelo menos 1 g.</span>
        )}
      </div>
    </Modal>
  )
}
