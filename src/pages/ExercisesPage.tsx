import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise } from '../db/db'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ExerciseFormModal } from '../components/ExerciseFormModal'
import { ExercisePhoto } from '../components/ExercisePhoto'
import { PlusIcon } from '../components/icons'
import { KIND_LABELS } from '../lib/format'

/** Agrupa por grupo muscular, deixando "Sem grupo" por último. */
function groupExercises(exercises: Exercise[]): [string, Exercise[]][] {
  const groups = new Map<string, Exercise[]>()

  for (const exercise of exercises) {
    const key = exercise.muscleGroup?.trim() || 'Sem grupo'
    const bucket = groups.get(key)
    if (bucket) bucket.push(exercise)
    else groups.set(key, [exercise])
  }

  return [...groups.entries()].sort(([a], [b]) => {
    if (a === 'Sem grupo') return 1
    if (b === 'Sem grupo') return -1
    return a.localeCompare(b, 'pt-BR')
  })
}

export function ExercisesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const exercises = useLiveQuery(
    () => db.exercises.filter((e) => e.archived === 0).toArray(),
    [],
  )

  // Sem uma porta de entrada aqui, um exercício arquivado ficaria inalcançável
  // para desarquivar — o gráfico dele só é acessível por link direto.
  const archived = useLiveQuery(
    async () =>
      (await db.exercises.filter((e) => e.archived === 1).toArray()).sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      ),
    [],
  )

  const filtered = useMemo(() => {
    if (!exercises) return []
    const term = search.trim().toLowerCase()
    const matched = term
      ? exercises.filter(
          (e) =>
            e.name.toLowerCase().includes(term) ||
            (e.muscleGroup ?? '').toLowerCase().includes(term),
        )
      : exercises
    return matched.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [exercises, search])

  const groups = useMemo(() => groupExercises(filtered), [filtered])

  return (
    <>
      <PageHeader
        title="Exercícios"
        subtitle={exercises ? `${exercises.length} no catálogo` : undefined}
        action={
          <button
            type="button"
            className="btn btn--icon btn--primary"
            aria-label="Novo exercício"
            onClick={() => setCreating(true)}
          >
            <PlusIcon />
          </button>
        }
      />

      <div className="page">
        <input
          className="input"
          type="search"
          value={search}
          placeholder="Buscar exercício ou grupo"
          onChange={(event) => setSearch(event.target.value)}
        />

        {exercises && filtered.length === 0 && (
          <EmptyState
            icon="🔍"
            title={search ? 'Nada encontrado' : 'Catálogo vazio'}
            description={
              search
                ? 'Nenhum exercício com esse nome.'
                : 'Cadastre os exercícios que você usa nos treinos.'
            }
            action={
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setCreating(true)}
              >
                {search ? `Criar "${search.trim()}"` : 'Novo exercício'}
              </button>
            }
          />
        )}

        {groups.map(([group, items]) => (
          <section key={group}>
            <h2 className="section-title">{group}</h2>
            <div className="list">
              {items.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  className="list__item"
                  onClick={() => navigate(`/exercicios/${exercise.id}`)}
                >
                  <ExercisePhoto photo={exercise.photo} name={exercise.name} />
                  <div className="list__main">
                    <div className="list__name">{exercise.name}</div>
                    <div className="list__meta">
                      {KIND_LABELS[exercise.kind]}
                    </div>
                  </div>
                  <span className="chevron">›</span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {archived && archived.length > 0 && !search && (
          <section>
            <h2 className="section-title">Arquivados</h2>
            <div className="list">
              {archived.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  className="list__item"
                  onClick={() => navigate(`/exercicios/${exercise.id}`)}
                >
                  <ExercisePhoto photo={exercise.photo} name={exercise.name} />
                  <div className="list__main">
                    <div className="list__name">{exercise.name}</div>
                    <div className="list__meta">
                      {KIND_LABELS[exercise.kind]} · fora do catálogo
                    </div>
                  </div>
                  <span className="chevron">›</span>
                </button>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 8 }}>
              O histórico deles continua inteiro. Abra para desarquivar.
            </p>
          </section>
        )}
      </div>

      {creating && (
        <ExerciseFormModal
          initialName={search.trim()}
          onClose={() => setCreating(false)}
          onSaved={() => setSearch('')}
        />
      )}
    </>
  )
}
