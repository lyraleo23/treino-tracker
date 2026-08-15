import { useState } from 'react'
import type { Workout } from '../db/db'
import { Modal } from './Modal'

interface Props {
  /** Treino em edição; ausente cria um novo. */
  workout?: Workout
  onSave: (data: { name: string }) => void
  onClose: () => void
}

/** A validade vive no programa, não aqui: um treino é só o plano de um dia. */
export function WorkoutFormModal({ workout, onSave, onClose }: Props) {
  const [name, setName] = useState(workout?.name ?? '')

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
            onClick={() => onSave({ name })}
          >
            Salvar
          </button>
        </>
      }
    >
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
    </Modal>
  )
}
