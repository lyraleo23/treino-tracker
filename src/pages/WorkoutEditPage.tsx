import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db, type Exercise, type WorkoutItem } from '../db/db'
import {
  addWorkoutItem,
  deleteWorkout,
  deleteWorkoutItem,
  moveWorkoutItem,
  renameWorkout,
  updateWorkoutItem,
} from '../db/actions'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog, Modal } from '../components/Modal'
import { ExercisePicker } from '../components/ExercisePicker'
import { WorkoutItemModal } from '../components/WorkoutItemModal'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from '../components/icons'
import { formatItemPlan } from '../lib/format'

export function WorkoutEditPage() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const navigate = useNavigate()

  const [picking, setPicking] = useState(false)
  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null)
  const [editingItem, setEditingItem] = useState<{
    item: WorkoutItem
    exercise: Exercise
  } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
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
    const rows = items.map((item, index) => ({ item, exercise: exercises[index] }))

    return { workout, rows }
  }, [workoutId])

  if (data === null) {
    return (
      <>
        <PageHeader title="Treino" back backTo="/" />
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
            {rows.map(({ item, exercise }, index) => (
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
                    onClick={() =>
                      exercise && setEditingItem({ item, exercise })
                    }
                  >
                    <div className="list__name">{exercise?.name ?? 'Exercício removido'}</div>
                    <div className="list__meta">{formatItemPlan(item)}</div>
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
            onClick={() => {
              setName(workout.name)
              setRenaming(true)
            }}
          >
            Renomear treino
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

      {pendingExercise && workoutId && (
        <WorkoutItemModal
          exercise={pendingExercise}
          onClose={() => setPendingExercise(null)}
          onSave={async ({ sets, target }) => {
            await addWorkoutItem({
              workoutId,
              exerciseId: pendingExercise.id,
              sets,
              target,
            })
            setPendingExercise(null)
          }}
        />
      )}

      {editingItem && (
        <WorkoutItemModal
          exercise={editingItem.exercise}
          item={editingItem.item}
          onClose={() => setEditingItem(null)}
          onSave={async ({ sets, target }) => {
            await updateWorkoutItem(editingItem.item.id, { sets, target })
            setEditingItem(null)
          }}
          onRemove={async () => {
            await deleteWorkoutItem(editingItem.item.id)
            setEditingItem(null)
          }}
        />
      )}

      {renaming && (
        <Modal
          title="Renomear treino"
          onClose={() => setRenaming(false)}
          actions={
            <>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setRenaming(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!name.trim()}
                onClick={async () => {
                  await renameWorkout(workout.id, name)
                  setRenaming(false)
                }}
              >
                Salvar
              </button>
            </>
          }
        >
          <div className="field">
            <label className="field__label" htmlFor="rename-workout">
              Nome
            </label>
            <input
              id="rename-workout"
              className="input"
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </Modal>
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
