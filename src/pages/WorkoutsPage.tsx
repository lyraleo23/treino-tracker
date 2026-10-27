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
import { AlertIcon, ArrowDownIcon, ArrowUpIcon, PlayIcon, PlusIcon } from '../components/icons'
import { formatCycle, formatDate, formatRelativeDay } from '../lib/format'
import { rotationTurn, type RotationEntry } from '../lib/rotation'

type WorkoutCard = RotationEntry

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

    // A validade é do programa: conta as sessões de todos os treinos dele que
    // estão na rotação — o avulso é adicional, não adianta o fim do ciclo.
    const ids = new Set(workouts.filter((w) => !w.outOfRotation).map((w) => w.id))
    const cycleStart = program?.cycleStartedAt ?? 0
    const cycleDone = sessions.filter(
      (s) => ids.has(s.workoutId) && s.finishedAt !== undefined && s.startedAt >= cycleStart,
    ).length

    const open = sessions
      .filter((s) => s.finishedAt === undefined)
      .sort((a, b) => b.startedAt - a.startedAt)[0]

    return { program, cards, cycleDone, open, ...rotationTurn(cards) }
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

  async function handleCreate(
    program: Program,
    draft: { name: string; inRotation: boolean },
  ) {
    const id = await createWorkout(program.id, draft)
    setCreating(false)
    navigate(`/treinos/${id}`)
  }

  const program = data?.program
  const cards = data?.cards ?? []
  const open = data?.open
  const next = data?.next
  const last = data?.last
  const cycle = formatCycle(program?.cycle, data?.cycleDone ?? 0)
  // A sessão aberta do próprio treino da vez continua pelo card dele; o aviso
  // de sessão em andamento fica para quando o que está aberto é outro treino.
  const openNext = open && open.workoutId === next?.workout.id ? open : undefined

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
        {open && !openNext && (
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

        {cycle?.warning && program ? (
          <div
            role="alert"
            className={`banner banner--stacked banner--alert${cycle.expired ? ' is-expired' : ''}`}
            style={{ marginBottom: 14 }}
          >
            <div className="banner__text">
              <strong>
                <AlertIcon width={18} height={18} />
                {cycle.warning.title}
              </strong>
              {cycle.warning.text}
            </div>
            <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
              {cycle.expired && (
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => void renewProgramCycle(program.id)}
                >
                  Renovar ciclo
                </button>
              )}
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => navigate('/programas')}
              >
                Próxima bateria
              </button>
            </div>
          </div>
        ) : (
          cycle && (
            <div className="row" style={{ marginBottom: 14 }}>
              <span className="chip">{cycle.label}</span>
            </div>
          )
        )}

        {next && (
          <section className="card card--next" style={{ marginBottom: 6 }}>
            <div className="eyebrow">Treino da vez</div>
            <div className="card__title card__title--lg">{next.workout.name}</div>
            <div className="card__meta">
              {next.exercises} {next.exercises === 1 ? 'exercício' : 'exercícios'}
              {next.lastSession
                ? ` · última: ${formatRelativeDay(next.lastSession)}`
                : ' · nunca feito'}
            </div>
            {last && last !== next && last.lastSession !== undefined && (
              <div className="card__meta">
                Último feito: {last.workout.name} · {formatRelativeDay(last.lastSession)}
              </div>
            )}

            <button
              type="button"
              className="btn btn--primary btn--block btn--lg"
              style={{ marginTop: 14 }}
              onClick={() =>
                openNext ? navigate(`/sessao/${openNext.id}`) : void handleStart(next.workout)
              }
            >
              <PlayIcon width={18} height={18} />
              {openNext ? 'Continuar treino' : 'Iniciar treino'}
            </button>
            {openNext && (
              <p className="hint" style={{ marginBottom: 0 }}>
                Sessão em andamento, iniciada {formatDate(openNext.startedAt)}.
              </p>
            )}
          </section>
        )}

        {next && <h2 className="section-title">Todos os treinos</h2>}

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
                  {(workout.id === next?.workout.id || workout.outOfRotation) && (
                    <div className="row" style={{ gap: 6, marginTop: 6 }}>
                      {workout.id === next?.workout.id && (
                        <span className="chip chip--accent">da vez</span>
                      )}
                      {workout.outOfRotation && <span className="chip">avulso</span>}
                    </div>
                  )}
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
                {/* Com o treino da vez em destaque lá em cima, o resto da lista
                    não disputa com ele: os botões daqui ficam neutros. */}
                <button
                  type="button"
                  className={next ? 'btn' : 'btn btn--primary'}
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
          onSave={(draft) => void handleCreate(program, draft)}
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
