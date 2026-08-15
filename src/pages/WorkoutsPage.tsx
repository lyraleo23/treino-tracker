import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db, type Program, type Session, type Workout } from '../db/db'
import {
  createWorkout,
  discardSession,
  moveWorkout,
  renewProgramCycle,
  startSession,
} from '../db/actions'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { WorkoutFormModal } from '../components/WorkoutFormModal'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from '../components/icons'
import { formatCycle, formatDate } from '../lib/format'

interface WorkoutCard {
  workout: Workout
  exercises: number
  lastSession?: number
}

export function WorkoutsPage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [conflict, setConflict] = useState<{ workout: Workout; open: Session } | null>(null)

  const data = useLiveQuery(async () => {
    // Exatamente um programa fica ativo; é dele que a aba mostra os treinos.
    const program = await db.programs.filter((p) => p.archived === 0).first()

    const workouts = program
      ? await db.workouts
          .where('[programId+order]')
          .between([program.id, Dexie.minKey], [program.id, Dexie.maxKey])
          .filter((w) => w.archived === 0)
          .toArray()
      : []

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

    // A validade é do programa: conta as sessões de todos os treinos dele.
    const ids = new Set(workouts.map((w) => w.id))
    const cycleStart = program?.cycleStartedAt ?? 0
    const cycleDone = sessions.filter(
      (s) => ids.has(s.workoutId) && s.finishedAt !== undefined && s.startedAt >= cycleStart,
    ).length

    const open = sessions
      .filter((s) => s.finishedAt === undefined)
      .sort((a, b) => b.startedAt - a.startedAt)[0]

    return { program, cards, cycleDone, open }
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

  async function handleCreate(program: Program, name: string) {
    const id = await createWorkout(program.id, name)
    setCreating(false)
    navigate(`/treinos/${id}`)
  }

  const program = data?.program
  const cards = data?.cards ?? []
  const open = data?.open
  const cycle = formatCycle(program?.cycle, data?.cycleDone ?? 0)

  return (
    <>
      <PageHeader
        title="Treinos"
        subtitle={program?.name ?? 'Nenhum programa ativo'}
        action={
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => navigate('/programas')}
          >
            Programas
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

        {cycle && (
          <div className="row row--between" style={{ marginBottom: 14 }}>
            <span className={cycle.expired ? 'chip chip--warn' : 'chip'}>{cycle.label}</span>
            {cycle.expired && program && (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => void renewProgramCycle(program.id)}
              >
                Renovar ciclo
              </button>
            )}
          </div>
        )}

        {data && !program && (
          <EmptyState
            icon="🗂️"
            title="Nenhum programa ativo"
            description="Os treinos moram dentro de um programa. Ative ou crie um para começar."
            action={
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate('/programas')}
              >
                Ver programas
              </button>
            }
          />
        )}

        {data && program && cards.length === 0 && (
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

        {program && cards.length > 0 && (
          <button
            type="button"
            className="btn btn--block"
            style={{ marginTop: 14 }}
            onClick={() => setCreating(true)}
          >
            <PlusIcon width={16} height={16} /> Novo treino
          </button>
        )}
      </div>

      {creating && program && (
        <WorkoutFormModal
          onClose={() => setCreating(false)}
          onSave={({ name }) => void handleCreate(program, name)}
        />
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
