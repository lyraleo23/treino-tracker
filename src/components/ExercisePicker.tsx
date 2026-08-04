import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise } from '../db/db'
import { Modal } from './Modal'
import { ExerciseFormModal } from './ExerciseFormModal'

interface Props {
  /** Exercícios já presentes no treino, marcados como adicionados. */
  usedIds?: string[]
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

export function ExercisePicker({ usedIds = [], onPick, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const exercises = useLiveQuery(
    () => db.exercises.filter((e) => e.archived === 0).toArray(),
    [],
  )

  const filtered = useMemo(() => {
    if (!exercises) return []
    const term = search.trim().toLowerCase()
    return exercises
      .filter(
        (e) =>
          !term ||
          e.name.toLowerCase().includes(term) ||
          (e.muscleGroup ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [exercises, search])

  return (
    <>
      <Modal
        title="Adicionar exercício"
        onClose={onClose}
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Fechar
            </button>
            <button type="button" className="btn" onClick={() => setCreating(true)}>
              Criar novo
            </button>
          </>
        }
      >
        <div className="stack">
          <input
            className="input"
            type="search"
            value={search}
            autoFocus
            placeholder="Buscar exercício"
            onChange={(event) => setSearch(event.target.value)}
          />

          {filtered.length === 0 ? (
            <p className="hint" style={{ margin: '8px 0' }}>
              Nenhum exercício encontrado. Use "Criar novo".
            </p>
          ) : (
            <div className="list">
              {filtered.map((exercise) => {
                const used = usedIds.includes(exercise.id)
                return (
                  <button
                    key={exercise.id}
                    type="button"
                    className="list__item"
                    onClick={() => onPick(exercise)}
                  >
                    <div className="list__main">
                      <div className="list__name">{exercise.name}</div>
                      <div className="list__meta">
                        {exercise.muscleGroup ?? 'Sem grupo'} ·{' '}
                        {exercise.kind === 'reps' ? 'Repetições' : 'Tempo'}
                      </div>
                    </div>
                    {used && <span className="chip chip--accent">no treino</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </Modal>

      {creating && (
        <ExerciseFormModal
          initialName={search.trim()}
          onClose={() => setCreating(false)}
          onSaved={async (id) => {
            const exercise = await db.exercises.get(id)
            if (exercise) onPick(exercise)
          }}
        />
      )}
    </>
  )
}
