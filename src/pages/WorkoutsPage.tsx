import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Session, type Workout } from '../db/db'
import { createWorkout, discardSession, moveWorkout, startSession } from '../db/actions'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from '../components/icons'
import { formatDate } from '../lib/format'

interface WorkoutCard {
  workout: Workout
  exercises: number
  lastSession?: number
}

export function WorkoutsPage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [conflict, setConflict] = useState<{ workout: Workout; open: Session } | null>(null)

  const data = useLiveQuery(async () => {
    const workouts = await db.workouts.filter((w) => w.archived === 0).sortBy('order')
    const items = await db.workoutItems.toArray()
    const sessions = await db.sessions.toArray()

    const cards: WorkoutCard[] = workouts.map((workout) => {
      const done = sessions
        .filter((s) => s.workoutId === workout.id && s.finishedAt !== undefined)
        .map((s) => s.finishedAt!)
      return {
        workout,
        exercises: items.filter((i) => i.workoutId === workout.id).length,
        lastSession: done.length > 0 ? Math.max(...done) : undefined,
      }
    })

    const open = sessions
      .filter((s) => s.finishedAt === undefined)
      .sort((a, b) => b.startedAt - a.startedAt)[0]

    return { cards, open }
  }, [])

  async function handleStart(workout: Workout) {
    const open = data?.open
    if (open) {
      const logs = await db.setLogs.where('sessionId').equals(open.id).count()
      if (logs > 0) {
        setConflict({ workout, open })
        return
      }
      // Sessão aberta e vazia é lixo de uma tentativa anterior: pode sumir.
      await discardSession(open.id)
    }
    navigate(`/sessao/${await startSession(workout)}`)
  }

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const id = await createWorkout(name)
    setNewName('')
    setCreating(false)
    navigate(`/treinos/${id}`)
  }

  const cards = data?.cards ?? []
  const open = data?.open

  return (
    <>
      <PageHeader
        title="Treinos"
        subtitle="Monte seus treinos e registre as sessões"
        action={
          <button
            type="button"
            className="btn btn--icon btn--primary"
            aria-label="Novo treino"
            onClick={() => setCreating(true)}
          >
            <PlusIcon />
          </button>
        }
      />

      <div className="page">
        {open && (
          <div className="banner" style={{ marginBottom: 14 }}>
            <div className="banner__text">
              <strong>Sessão em andamento</strong>
              {open.workoutName} · iniciada {formatDate(open.startedAt)}
            </div>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => navigate(`/sessao/${open.id}`)}
            >
              Continuar
            </button>
          </div>
        )}

        {data && cards.length === 0 && (
          <EmptyState
            icon="🏋️"
            title="Nenhum treino ainda"
            description="Crie o Treino A, B, C... e adicione os exercícios de cada um."
            action={
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setCreating(true)}
              >
                Criar primeiro treino
              </button>
            }
          />
        )}

        <div className="stack">
          {cards.map(({ workout, exercises, lastSession }, index) => (
            <div key={workout.id} className="card">
              <div className="row row--between">
                <div style={{ minWidth: 0 }}>
                  <div className="card__title">{workout.name}</div>
                  <div className="card__meta">
                    {exercises} {exercises === 1 ? 'exercício' : 'exercícios'}
                    {lastSession ? ` · última: ${formatDate(lastSession)}` : ' · nunca feito'}
                  </div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button
                    type="button"
                    className="btn btn--icon btn--ghost"
                    aria-label="Mover para cima"
                    disabled={index === 0}
                    onClick={() => void moveWorkout(workout.id, -1)}
                  >
                    <ArrowUpIcon />
                  </button>
                  <button
                    type="button"
                    className="btn btn--icon btn--ghost"
                    aria-label="Mover para baixo"
                    disabled={index === cards.length - 1}
                    onClick={() => void moveWorkout(workout.id, 1)}
                  >
                    <ArrowDownIcon />
                  </button>
                </div>
              </div>

              <div className="row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ flex: 1 }}
                  disabled={exercises === 0}
                  onClick={() => void handleStart(workout)}
                >
                  Iniciar treino
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigate(`/treinos/${workout.id}`)}
                >
                  Editar
                </button>
              </div>

              {exercises === 0 && (
                <p className="hint" style={{ marginBottom: 0 }}>
                  Adicione exercícios para poder iniciar.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {creating && (
        <Modal
          title="Novo treino"
          onClose={() => setCreating(false)}
          actions={
            <>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setCreating(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!newName.trim()}
                onClick={() => void handleCreate()}
              >
                Criar
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
              value={newName}
              autoFocus
              placeholder="Treino A"
              onChange={(event) => setNewName(event.target.value)}
            />
          </div>
        </Modal>
      )}

      {conflict && (
        <Modal
          title="Sessão em andamento"
          onClose={() => setConflict(null)}
          actions={
            <>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={async () => {
                  await discardSession(conflict.open.id)
                  const id = await startSession(conflict.workout)
                  setConflict(null)
                  navigate(`/sessao/${id}`)
                }}
              >
                Descartar e começar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  const id = conflict.open.id
                  setConflict(null)
                  navigate(`/sessao/${id}`)
                }}
              >
                Continuar
              </button>
            </>
          }
        >
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 15 }}>
            Você já tem uma sessão de <strong>{conflict.open.workoutName}</strong> com séries
            registradas. Continuar aquela sessão ou descartá-la e começar{' '}
            {conflict.workout.name}?
          </p>
        </Modal>
      )}
    </>
  )
}
