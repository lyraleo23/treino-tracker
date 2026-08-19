import { useState } from 'react'
import type { Drink, DrinkLog } from '../db/db'
import { deleteDrinkLog, updateDrinkLog } from '../db/actions'
import { Modal } from './Modal'
import { parseNumber } from '../lib/format'

interface Props {
  log: DrinkLog
  drinks: Drink[]
  onClose: () => void
}

/** Corrige um lançamento do dia: trocar a bebida, a quantidade, ou apagar. */
export function DrinkLogModal({ log, drinks, onClose }: Props) {
  const [drinkId, setDrinkId] = useState(log.drinkId)
  const [ml, setMl] = useState(String(log.ml))

  const parsed = parseNumber(ml)
  const invalido = parsed === undefined || parsed <= 0

  const escolhida = drinks.find((d) => d.id === drinkId)
  // Mostrado só quando o fator morde, para o número ajustado não surpreender.
  const contara =
    !invalido && escolhida && escolhida.factor !== 1
      ? Math.round(parsed * escolhida.factor)
      : undefined

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
              await deleteDrinkLog(log.id)
              onClose()
            }}
          >
            Apagar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={invalido}
            onClick={async () => {
              await updateDrinkLog(log.id, { drinkId, ml: parsed! })
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
          <span className="field__label">Bebida</span>
          <div className="chip-grid">
            {drinks.map((drink) => (
              <button
                key={drink.id}
                type="button"
                className={drink.id === drinkId ? 'chip-option is-active' : 'chip-option'}
                onClick={() => setDrinkId(drink.id)}
              >
                {drink.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="drink-ml">
            Quantidade (ml)
          </label>
          <input
            id="drink-ml"
            className="input input--center"
            inputMode="numeric"
            value={ml}
            onChange={(event) => setMl(event.target.value)}
          />
          {contara !== undefined && (
            <span className="hint">
              Conta {contara} ml para a meta ({Math.round(escolhida!.factor * 100)}%).
            </span>
          )}
        </div>
      </div>
    </Modal>
  )
}
