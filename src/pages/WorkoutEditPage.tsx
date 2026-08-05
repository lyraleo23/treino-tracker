import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db, type Exercise } from '../db/db'
import {
  addWorkoutItem,
  deleteWorkout,
  deleteWorkoutItem,
  moveWorkoutItem,
  updateWorkout,
  type BlockPreset,
} from '../db/actions'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog, Modal } from '../components/Modal'
import { ExercisePicker } from '../components/ExercisePicker'
import { WorkoutFormModal } from '../components/WorkoutFormModal'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '../components/icons'
import { formatBlocksSummary } from '../lib/format'

export function WorkoutEditPage() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const navigate = useNavigate()

  const [picking, setPicking] = useState(false)
  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null)
  const [removingItem, setRemovingItem] = useState<{ id: string; name: string } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const data = useLiveQuery(async () => {
    if (!workoutId) return null
    const workout = await db.workouts.get(workoutId)
    if (!workout) return null

    const items = await db.workoutItems
      .where('[workoutId+order]')
      .between([workoutId, Dexie.minKey], [workoutId, Dexie.maxKey])
      .toArray()

    const exercises = await db.exercises.bulkGet(items.map((i) => i.exerciseId))
    const rows = await Promise.all(
      items.map(async (item, index) => ({
        item,
        exercise: exercises[index],
        blocks: await db.setBlocks
          .where('[workoutItemId+order]')
          .between([item.id, Dexie.minKey], [item.id, Dexie.maxKey])
          .toArray(),
      })),
    )

    return { workout, rows }
  }, [workoutId])

  async function handleAdd(exercise: Exercise, preset?: BlockPreset) {
    if (!workoutId) return
    const itemId = await addWorkoutItem({ workoutId, exerciseId: exercise.id, preset })
    setPendingExercise(null)
    // Sem modelo o exercício nasce vazio, então já abre a tela de montagem.
    if (!preset) navigate(`/treinos/${workoutId}/item/${itemId}`)
  }

  if (data === null) {
    return (
      <>
        <PageHeader title="Treino" back backTo="/" backLabel="Treinos" />
        <div className="page">
          <EmptyState icon="🤔" title="Treino não encontrado" />
        </div>
      </>
    )
  }

  if (!data) return <div className="page" />

  const { workout, rows } = data

  return (
    <>
      <PageHeader
        title={workout.name}
        subtitle={`${rows.length} ${rows.length === 1 ? 'exercício' : 'exercícios'}`}
        back
        backTo="/"
        backLabel="Treinos"
        action={
          <button
            type="button"
            className="btn btn--icon btn--primary"
            aria-label="Adicionar exercício"
            onClick={() => setPicking(true)}
          >
            <PlusIcon />
          </button>
        }
      />

      <div className="page">
        {rows.length === 0 ? (
          <EmptyState
            icon="➕"
            title="Treino vazio"
            description="Adicione os exercícios que fazem parte deste treino."
            action={
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setPicking(true)}
              >
                Adicionar exercício
              </button>
            }
          />
        ) : (
          <div className="stack">
            {rows.map(({ item, exercise, blocks }, index) => (
              <div key={item.id} className="card card--tight">
                <div className="row row--between">
                  <button
                    type="button"
                    className="list__main"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/treinos/${workoutId}/item/${item.id}`)}
                  >
                    <div className="list__name">
                      {exercise?.name ?? 'Exercício removido'}
                    </div>
                    <div className="list__meta">{formatBlocksSummary(blocks)}</div>
                  </button>
                  <div className="row" style={{ gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn--icon btn--ghost"
                      aria-label="Mover para cima"
                      disabled={index === 0}
                      onClick={() => void moveWorkoutItem(item.id, -1)}
                    >
                      <ArrowUpIcon />
                    </button>
                    <button
                      type="button"
                      className="btn btn--icon btn--ghost"
                      aria-label="Mover para baixo"
                      disabled={index === rows.length - 1}
                      onClick={() => void moveWorkoutItem(item.id, 1)}
                    >
                      <ArrowDownIcon />
                    </button>
                    <button
                      type="button"
                      className="btn btn--icon btn--ghost"
                      aria-label="Remover do treino"
                      onClick={() =>
                        setRemovingItem({
                          id: item.id,
                          name: exercise?.name ?? 'este exercício',
                        })
                      }
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="section-title">Treino</h2>
        <div className="stack">
          <button
            type="button"
            className="btn btn--block"
            onClick={() => setRenaming(true)}
          >
            Editar treino
          </button>
          <button
            type="button"
            className="btn btn--block btn--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Excluir treino
          </button>
          <p className="hint">
            Excluir o treino não apaga o histórico das sessões já realizadas.
          </p>
        </div>
      </div>

      {picking && (
        <ExercisePicker
          usedIds={rows.map(({ item }) => item.exerciseId)}
          onClose={() => setPicking(false)}
          onPick={(exercise) => {
            setPicking(false)
            setPendingExercise(exercise)
          }}
        />
      )}

      {pendingExercise && (
        <Modal
          title={pendingExercise.name}
          onClose={() => setPendingExercise(null)}
          actions={
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => setPendingExercise(null)}
            >
              Cancelar
            </button>
          }
        >
          <p className="hint" style={{ marginTop: 0 }}>
            Como montar os blocos de séries deste exercício?
          </p>
          <div className="stack">
            {pendingExercise.kind === 'cardio' ? (
              <>
                <button
                  type="button"
                  className="btn btn--block btn--primary"
                  onClick={() => void handleAdd(pendingExercise, 'cardioLadder')}
                >
                  Escada de trechos
                  <span className="hint" style={{ marginLeft: 6 }}>
                    4 trechos de 4 min
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn--block"
                  onClick={() => void handleAdd(pendingExercise, 'cardio')}
                >
                  Trecho único
                  <span className="hint" style={{ marginLeft: 6 }}>
                    20 min contínuos
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn--block btn--primary"
                  onClick={() => void handleAdd(pendingExercise, 'feederWorking')}
                >
                  Feeder + Working
                  <span className="hint" style={{ marginLeft: 6 }}>
                    2×5–6, 2×5–6, 2×8–10, 2×8–10
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn--block"
                  onClick={() =>
                    void handleAdd(
                      pendingExercise,
                      pendingExercise.kind === 'time' ? 'time' : 'simple',
                    )
                  }
                >
                  Simples
                  <span className="hint" style={{ marginLeft: 6 }}>
                    {pendingExercise.kind === 'time' ? '3 × 60s' : '3 × 8–12'}
                  </span>
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn--block"
              onClick={() => void handleAdd(pendingExercise)}
            >
              Montar do zero
            </button>
          </div>
        </Modal>
      )}

      {removingItem && (
        <ConfirmDialog
          title="Remover do treino"
          message={`${removingItem.name} sai deste treino junto com os blocos configurados. O histórico das sessões continua.`}
          confirmLabel="Remover"
          danger
          onCancel={() => setRemovingItem(null)}
          onConfirm={async () => {
            await deleteWorkoutItem(removingItem.id)
            setRemovingItem(null)
          }}
        />
      )}

      {renaming && (
        <WorkoutFormModal
          workout={workout}
          onClose={() => setRenaming(false)}
          onSave={async ({ name, cycle }) => {
            await updateWorkout(workout.id, { name, cycle })
            setRenaming(false)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir treino"
          message={`"${workout.name}" e sua lista de exercícios serão apagados. O histórico das sessões continua no app.`}
          confirmLabel="Excluir"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteWorkout(workout.id)
            navigate('/')
          }}
        />
      )}
    </>
  )
}
