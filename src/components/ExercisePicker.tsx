import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type ExerciseKind } from '../db/db'
import { KIND_LABELS } from '../lib/format'
import { Modal } from './Modal'
import { ExerciseFormModal } from './ExerciseFormModal'

interface Props {
  /** Exercícios já presentes no treino, marcados como adicionados. */
  usedIds?: string[]
  /** Some da lista por completo — o destino de uma mesclagem, por exemplo. */
  excludeIds?: string[]
  /** Restringe a um tipo só; usado pela mesclagem, que não mistura reps e tempo. */
  kind?: ExerciseKind
  title?: string
  /** Texto acima da busca, quando a escolha precisa de contexto. */
  hint?: string
  /** Criar na hora não faz sentido ao escolher destino de mesclagem. */
  allowCreate?: boolean
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

export function ExercisePicker({
  usedIds = [],
  excludeIds = [],
  kind,
  title = 'Adicionar exercício',
  hint,
  allowCreate = true,
  onPick,
  onClose,
}: Props) {
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
      .filter((e) => !excludeIds.includes(e.id))
      .filter((e) => !kind || e.kind === kind)
      .filter(
        (e) =>
          !term ||
          e.name.toLowerCase().includes(term) ||
          (e.muscleGroup ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [exercises, search, kind, excludeIds])

  return (
    <>
      <Modal
        title={title}
        onClose={onClose}
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Fechar
            </button>
            {allowCreate && (
              <button type="button" className="btn" onClick={() => setCreating(true)}>
                Criar novo
              </button>
            )}
          </>
        }
      >
        <div className="stack">
          {hint && (
            <p className="hint" style={{ margin: 0 }}>
              {hint}
            </p>
          )}
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
              {allowCreate
                ? 'Nenhum exercício encontrado. Use "Criar novo".'
                : 'Nenhum exercício compatível encontrado.'}
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
                        {KIND_LABELS[exercise.kind]}
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
