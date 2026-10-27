import { useState } from 'react'
import type { Workout } from '../db/db'
import { Modal } from './Modal'

interface Props {
  /** Treino em edição; ausente cria um novo. */
  workout?: Workout
  onSave: (data: { name: string; inRotation: boolean }) => void
  onClose: () => void
}

/** A validade vive no programa, não aqui: um treino é só o plano de um dia. */
export function WorkoutFormModal({ workout, onSave, onClose }: Props) {
  const [name, setName] = useState(workout?.name ?? '')
  const [inRotation, setInRotation] = useState(!workout?.outOfRotation)

  return (
    <Modal
      title={workout ? 'Editar treino' : 'Novo treino'}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!name.trim()}
            onClick={() => onSave({ name, inRotation })}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="workout-name">
            Nome
          </label>
          <input
            id="workout-name"
            className="input"
            value={name}
            autoFocus={!workout}
            placeholder="A · Upper Body 1"
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <span className="field__label">Rotação</span>
          <div className="segmented">
            <button
              type="button"
              aria-pressed={inRotation}
              onClick={() => setInRotation(true)}
            >
              Na rotação
            </button>
            <button
              type="button"
              aria-pressed={!inRotation}
              onClick={() => setInRotation(false)}
            >
              Avulso
            </button>
          </div>
          <span className="hint">
            {inRotation
              ? 'Entra na sequência A, B, C... e vira o treino da vez quando chegar a hora.'
              : 'Para o adicional, como o aeróbico: fica na lista e pode ser feito a qualquer hora, mas a vez passa direto por ele e as sessões não contam no ciclo.'}
          </span>
        </div>
      </div>
    </Modal>
  )
}
