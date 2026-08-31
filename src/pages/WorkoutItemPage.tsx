import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db, type SetBlock } from '../db/db'
import {
  BACKOFF_DEFAULT,
  CLUSTER_DEFAULT,
  WARMUP_DEFAULT,
  addSetBlock,
  applyPreset,
  deleteSetBlock,
  duplicateSetBlock,
  moveSetBlock,
  updateSetBlock,
} from '../db/actions'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { SetBlockModal, type BlockFormData } from '../components/SetBlockModal'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from '../components/icons'
import { blockPlanParts, formatBlockLabel, formatRest } from '../lib/format'

export function WorkoutItemPage() {
  const { workoutId, itemId } = useParams<{ workoutId: string; itemId: string }>()
  const [creating, setCreating] = useState<Partial<BlockFormData> | null>(null)
  const [editing, setEditing] = useState<SetBlock | null>(null)

  const data = useLiveQuery(async () => {
    if (!itemId) return null
    const item = await db.workoutItems.get(itemId)
    if (!item) return null

    const exercise = await db.exercises.get(item.exerciseId)
    if (!exercise) return null

    const blocks = await db.setBlocks
      .where('[workoutItemId+order]')
      .between([itemId, Dexie.minKey], [itemId, Dexie.maxKey])
      .toArray()

    return { item, exercise, blocks }
  }, [itemId])

  if (data === null) {
    return (
      <>
        <PageHeader
          title="Exercício"
          back
          backTo={`/treinos/${workoutId}`}
          backLabel="Treino"
        />
        <div className="page">
          <EmptyState icon="🤔" title="Exercício não encontrado neste treino" />
        </div>
      </>
    )
  }

  if (!data) return <div className="page" />

  const { exercise, blocks } = data

  return (
    <>
      <PageHeader
        title={exercise.name}
        subtitle={`${blocks.length} ${blocks.length === 1 ? 'bloco' : 'blocos'} de séries`}
        back
        backTo={`/treinos/${workoutId}`}
        backLabel="Treino"
        action={
          <button
            type="button"
            className="btn btn--icon btn--primary"
            aria-label="Novo bloco"
            onClick={() => setCreating({})}
          >
            <PlusIcon />
          </button>
        }
      />

      <div className="page">
        {blocks.length === 0 ? (
          <EmptyState
            icon="🧱"
            title="Sem blocos ainda"
            description="Use um modelo pronto ou monte os blocos um a um."
            action={
              <div className="stack">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() =>
                    itemId &&
                    void applyPreset(
                      itemId,
                      exercise.kind === 'cardio' ? 'cardioLadder' : 'clusterFull',
                    )
                  }
                >
                  {exercise.kind === 'cardio'
                    ? 'Usar escada de 4 trechos'
                    : 'Usar modelo completo (aquecimento → back-off)'}
                </button>
                {exercise.kind !== 'cardio' && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => itemId && void applyPreset(itemId, 'feederWorking')}
                  >
                    Usar modelo Feeder + Working
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    itemId &&
                    void applyPreset(
                      itemId,
                      exercise.kind === 'cardio'
                        ? 'cardio'
                        : exercise.kind === 'time'
                          ? 'time'
                          : 'simple',
                    )
                  }
                >
                  {exercise.kind === 'cardio' ? 'Usar trecho único' : 'Usar modelo simples'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setCreating({})}>
                  Criar bloco do zero
                </button>
              </div>
            }
          />
        ) : (
          <div className="stack">
            {blocks.map((block, index) => {
              const rest = formatRest(block)
              const plan = blockPlanParts(block)
              return (
                <div key={block.id} className={`card card--tight block block--${block.kind}`}>
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
                      onClick={() => setEditing(block)}
                    >
                      <div className="block__title">{formatBlockLabel(block, blocks)}</div>
                      <div className="block__meta">
                        {plan.prefix && `${plan.prefix} `}
                        <strong>{plan.target}</strong>
                        {rest && (
                          <>
                            {' · intervalo '}
                            <strong>{rest}</strong>
                          </>
                        )}
                      </div>
                      {block.note && <div className="block__hint">{block.note}</div>}
                    </button>
                    <div className="row" style={{ gap: 4 }}>
                      <button
                        type="button"
                        className="btn btn--icon btn--ghost"
                        aria-label="Mover para cima"
                        disabled={index === 0}
                        onClick={() => void moveSetBlock(block.id, -1)}
                      >
                        <ArrowUpIcon />
                      </button>
                      <button
                        type="button"
                        className="btn btn--icon btn--ghost"
                        aria-label="Mover para baixo"
                        disabled={index === blocks.length - 1}
                        onClick={() => void moveSetBlock(block.id, 1)}
                      >
                        <ArrowDownIcon />
                      </button>
                      <button
                        type="button"
                        className="btn btn--icon btn--ghost"
                        aria-label="Duplicar bloco"
                        onClick={() => void duplicateSetBlock(block.id)}
                      >
                        ⧉
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {blocks.length > 0 && (
          <>
            <h2 className="section-title">Adicionar</h2>
            <div className="stack">
              <button
                type="button"
                className="btn btn--block"
                onClick={() => setCreating(WARMUP_DEFAULT)}
              >
                Bloco de aquecimento
              </button>
              {exercise.kind === 'cardio' ? (
                <button
                  type="button"
                  className="btn btn--block"
                  onClick={() => setCreating({ kind: 'interval', sets: 1 })}
                >
                  Trecho
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn--block"
                    onClick={() => setCreating({ kind: 'feeder', sets: 2 })}
                  >
                    Feeder set
                  </button>
                  <button
                    type="button"
                    className="btn btn--block"
                    onClick={() => setCreating({ kind: 'working', sets: 2 })}
                  >
                    Working set
                  </button>
                  <button
                    type="button"
                    className="btn btn--block"
                    onClick={() => setCreating(CLUSTER_DEFAULT)}
                  >
                    Cluster-set
                  </button>
                  <button
                    type="button"
                    className="btn btn--block"
                    onClick={() => setCreating(BACKOFF_DEFAULT)}
                  >
                    Back-off
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn--block btn--ghost"
                onClick={() => itemId && void applyPreset(itemId, 'feederWorking')}
              >
                Acrescentar modelo Feeder + Working
              </button>
              {exercise.kind !== 'cardio' && (
                <button
                  type="button"
                  className="btn btn--block btn--ghost"
                  onClick={() => itemId && void applyPreset(itemId, 'clusterFull')}
                >
                  Acrescentar modelo Cluster + Back-off
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {creating && itemId && (
        <SetBlockModal
          exercise={exercise}
          initial={creating}
          onClose={() => setCreating(null)}
          onSave={async (form) => {
            await addSetBlock(itemId, form)
            setCreating(null)
          }}
        />
      )}

      {editing && (
        <SetBlockModal
          exercise={exercise}
          block={editing}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            await updateSetBlock(editing.id, form)
            setEditing(null)
          }}
          onRemove={async () => {
            await deleteSetBlock(editing.id)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
