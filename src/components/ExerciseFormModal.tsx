import { useState } from 'react'
import type { Exercise, ExerciseKind } from '../db/db'
import { createExercise, updateExercise } from '../db/actions'
import { Modal } from './Modal'

interface Props {
  /** Exercício em edição; ausente cria um novo. */
  exercise?: Exercise
  /** Nome sugerido ao criar (vem da busca sem resultados). */
  initialName?: string
  onClose: () => void
  onSaved?: (id: string) => void
}

export function ExerciseFormModal({ exercise, initialName, onClose, onSaved }: Props) {
  const [name, setName] = useState(exercise?.name ?? initialName ?? '')
  const [kind, setKind] = useState<ExerciseKind>(exercise?.kind ?? 'reps')
  const [muscleGroup, setMuscleGroup] = useState(exercise?.muscleGroup ?? '')
  const [notes, setNotes] = useState(exercise?.notes ?? '')

  const canSave = name.trim().length > 0

  async function handleSave() {
    if (!canSave) return

    if (exercise) {
      await updateExercise(exercise.id, {
        name: name.trim(),
        kind,
        muscleGroup: muscleGroup.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onSaved?.(exercise.id)
    } else {
      const id = await createExercise({ name, kind, muscleGroup, notes })
      onSaved?.(id)
    }
    onClose()
  }

  return (
    <Modal
      title={exercise ? 'Editar exercício' : 'Novo exercício'}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="exercise-name">
            Nome
          </label>
          <input
            id="exercise-name"
            className="input"
            value={name}
            autoFocus={!exercise}
            placeholder="Supino reto"
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <span className="field__label">Medição</span>
          <div className="segmented">
            <button
              type="button"
              aria-pressed={kind === 'reps'}
              onClick={() => setKind('reps')}
            >
              Repetições
            </button>
            <button
              type="button"
              aria-pressed={kind === 'time'}
              onClick={() => setKind('time')}
            >
              Tempo
            </button>
          </div>
          <span className="hint">
            {kind === 'reps'
              ? 'Registra peso e número de repetições.'
              : 'Registra a duração executada (e peso, se houver).'}
          </span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="exercise-group">
            Grupo muscular
          </label>
          <input
            id="exercise-group"
            className="input"
            value={muscleGroup}
            placeholder="Peito"
            onChange={(event) => setMuscleGroup(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="exercise-notes">
            Observações
          </label>
          <textarea
            id="exercise-notes"
            className="textarea"
            value={notes}
            placeholder="Pegada, ajuste do banco, cadência..."
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
