import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db, type Exercise, type SetBlock, type SetLog, type WorkoutItem } from '../db/db'
import { deleteSetLog, discardSession, finishSession, saveSetLog } from '../db/actions'
import {
  getLastSetsForBlocks,
  getLastSetsForExercises,
  getProgressionSuggestion,
  type ProgressionSuggestion,
} from '../db/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/Modal'
import { TimerCell } from '../components/TimerCell'
import { CheckIcon, NoteIcon, PlusIcon } from '../components/icons'
import {
  formatBlockLabel,
  formatBlockPlan,
  formatRest,
  formatSeconds,
  formatWeight,
  parseNumber,
  targetReps,
  targetSeconds,
} from '../lib/format'

type Draft = { weight?: string; reps?: string; seconds?: string; note?: string }
type Drafts = Record<string, Draft>

interface Row {
  item: WorkoutItem
  exercise: Exercise
  blocks: SetBlock[]
}

const rowKey = (blockId: string, setIndex: number) => `${blockId}#${setIndex}`

/** Mostra número com vírgula, do jeito que se digita no teclado brasileiro. */
function toInput(value: number | undefined): string {
  if (value === undefined) return ''
  return String(value).replace('.', ',')
}

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [drafts, setDrafts] = useState<Drafts>({})
  const [extraSets, setExtraSets] = useState<Record<string, number>>({})
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({})
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const data = useLiveQuery(async () => {
    if (!sessionId) return null
    const session = await db.sessions.get(sessionId)
    if (!session) return null

    const items = await db.workoutItems
      .where('[workoutId+order]')
      .between([session.workoutId, Dexie.minKey], [session.workoutId, Dexie.maxKey])
      .toArray()

    const exercises = await db.exercises.bulkGet(items.map((i) => i.exerciseId))
    const rows: Row[] = []
    for (const [index, item] of items.entries()) {
      const exercise = exercises[index]
      if (!exercise) continue
      rows.push({
        item,
        exercise,
        blocks: await db.setBlocks
          .where('[workoutItemId+order]')
          .between([item.id, Dexie.minKey], [item.id, Dexie.maxKey])
          .toArray(),
      })
    }

    const logs = await db.setLogs.where('sessionId').equals(sessionId).toArray()
    const allBlocks = rows.flatMap((row) => row.blocks)

    const lastByBlock = await getLastSetsForBlocks(
      allBlocks.map((block) => block.id),
      sessionId,
    )
    const lastByExercise = await getLastSetsForExercises(
      [...new Set(rows.map((row) => row.item.exerciseId))],
      sessionId,
    )

    const suggestions = new Map<string, ProgressionSuggestion>()
    for (const row of rows) {
      const suggestion = await getProgressionSuggestion(
        row.item.exerciseId,
        row.blocks,
        sessionId,
      )
      if (suggestion) suggestions.set(row.item.exerciseId, suggestion)
    }

    return { session, rows, logs, lastByBlock, lastByExercise, suggestions }
  }, [sessionId])

  function patchDraft(key: string, patch: Draft) {
    setDrafts((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  }

  if (data === null) {
    return (
      <>
        <PageHeader title="Sessão" back backTo="/" />
        <div className="page page--flush">
          <EmptyState icon="🤔" title="Sessão não encontrada" />
        </div>
      </>
    )
  }

  if (!data) return <div className="page page--flush" />

  const { session, rows, logs, lastByBlock, lastByExercise, suggestions } = data

  const setCountOf = (block: SetBlock) => {
    const blockLogs = logs.filter((log) => log.blockId === block.id)
    const maxIndex = blockLogs.reduce((max, log) => Math.max(max, log.setIndex), -1)
    return Math.max(block.sets, maxIndex + 1) + (extraSets[block.id] ?? 0)
  }

  const totalPlanned = rows.reduce(
    (sum, row) => sum + row.blocks.reduce((acc, block) => acc + setCountOf(block), 0),
    0,
  )

  /**
   * Sobe a carga de todos os blocos do exercício — feeders inclusive — cada um
   * a partir do próprio peso anterior, para o feeder seguir mais leve que o
   * working em vez de igualar a carga.
   */
  function applyProgression(row: Row, increment: number) {
    setDrafts((current) => {
      const next = { ...current }
      for (const block of row.blocks) {
        const base =
          lastByBlock.get(block.id)?.weight ??
          lastByExercise.get(row.item.exerciseId)?.weight
        if (base === undefined) continue

        const value = toInput(base + increment)
        for (let index = 0; index < setCountOf(block); index += 1) {
          const key = rowKey(block.id, index)
          next[key] = { ...next[key], weight: value }
        }
      }
      return next
    })
    setDismissed((current) => ({ ...current, [row.item.exerciseId]: true }))
  }

  async function handleFinish() {
    if (!sessionId) return
    const result = await finishSession(sessionId)
    navigate(result === 'finished' ? `/historico/${sessionId}` : '/', { replace: true })
  }

  return (
    <>
      <PageHeader
        title={session.workoutName}
        subtitle={`${logs.length} de ${totalPlanned} séries registradas`}
        back
        backTo="/"
        action={
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => void handleFinish()}
          >
            Finalizar
          </button>
        }
      />

      <div className="page page--flush">
        {rows.length === 0 && (
          <EmptyState
            icon="📭"
            title="Treino sem exercícios"
            description="Adicione exercícios ao treino antes de registrar uma sessão."
          />
        )}

        <div className="stack">
          {rows.map((row) => {
            const { item, exercise, blocks } = row
            const suggestion = suggestions.get(item.exerciseId)

            return (
              <section key={item.id} className="card">
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
                  onClick={() => navigate(`/exercicios/${exercise.id}`)}
                >
                  <div className="card__title">{exercise.name}</div>
                </button>

                {suggestion && !dismissed[item.exerciseId] && (
                  <div className="banner" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                    <div className="banner__text">
                      <strong>Hora de subir a carga</strong>
                      {suggestion.reason}
                    </div>
                    <div className="row" style={{ gap: 6, width: '100%' }}>
                      <button
                        type="button"
                        className="btn btn--sm btn--primary"
                        onClick={() => applyProgression(row, 2.5)}
                      >
                        +2,5 kg
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--primary"
                        onClick={() => applyProgression(row, 5)}
                      >
                        +5 kg
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() =>
                          setDismissed((current) => ({
                            ...current,
                            [item.exerciseId]: true,
                          }))
                        }
                      >
                        Agora não
                      </button>
                    </div>
                  </div>
                )}

                {blocks.length === 0 && (
                  <p className="hint">
                    Este exercício não tem blocos configurados. Edite o treino para
                    montá-los.
                  </p>
                )}

                {blocks.map((block) => {
                  const isTimeRow = block.target.kind === 'time'
                  const last = lastByBlock.get(block.id)
                  const fallback = lastByExercise.get(item.exerciseId)
                  const rest = formatRest(block)
                  const blockLogs = logs.filter((log) => log.blockId === block.id)

                  // Peso sugerido: o da série anterior deste bloco, senão o último
                  // registrado no bloco, senão o último do exercício.
                  let carryWeight = toInput((last ?? fallback)?.weight)

                  return (
                    <div key={block.id} className={`block block--${block.kind}`}>
                      <div className="block__title">
                        {formatBlockLabel(block, blocks)}
                      </div>
                      <div className="block__meta">
                        {formatBlockPlan(block)}
                        {rest && ` · intervalo ${rest}`}
                      </div>
                      {block.note && <div className="block__hint">{block.note}</div>}
                      <div className="block__hint">
                        {last
                          ? `Último: ${formatWeight(last.weight)}${
                              last.reps ? ` × ${last.reps}` : ''
                            }${last.seconds ? ` · ${formatSeconds(last.seconds)}` : ''}`
                          : 'Primeira vez registrando este bloco.'}
                      </div>

                      <div className={isTimeRow ? 'set-heads set-heads--time' : 'set-heads'}>
                        <span />
                        <span>Peso (kg)</span>
                        <span>{isTimeRow ? 'Tempo (s)' : 'Reps'}</span>
                        <span />
                        <span />
                      </div>

                      {Array.from({ length: setCountOf(block) }, (_, setIndex) => {
                        const key = rowKey(block.id, setIndex)
                        const log = blockLogs.find((entry) => entry.setIndex === setIndex)
                        const draft = drafts[key] ?? {}

                        const weightValue =
                          draft.weight ?? (log ? toInput(log.weight) : carryWeight)
                        const repsValue =
                          draft.reps ??
                          (log
                            ? toInput(log.reps)
                            : toInput(last?.reps ?? targetReps(block.target)))
                        const secondsValue =
                          draft.seconds ??
                          (log ? toInput(log.seconds) : toInput(targetSeconds(block.target)))
                        const noteValue = draft.note ?? log?.note ?? ''

                        carryWeight = weightValue

                        const persist = (existing: SetLog | undefined) =>
                          saveSetLog({
                            id: existing?.id,
                            sessionId: session.id,
                            exerciseId: item.exerciseId,
                            workoutItemId: item.id,
                            blockId: block.id,
                            setIndex,
                            weight: parseNumber(weightValue),
                            reps: isTimeRow ? undefined : parseNumber(repsValue),
                            seconds: isTimeRow ? parseNumber(secondsValue) : undefined,
                            note: noteValue,
                          })

                        const noteOpen = openNotes[key] || noteValue.length > 0

                        return (
                          <div key={key}>
                            <div
                              className={[
                                'set-row',
                                isTimeRow ? 'set-row--time' : '',
                                log ? 'is-done' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              <span className="set-row__index">{setIndex + 1}</span>

                              <input
                                className="input input--center"
                                inputMode="decimal"
                                placeholder="—"
                                aria-label={`Peso da série ${setIndex + 1}`}
                                value={weightValue}
                                onChange={(event) =>
                                  patchDraft(key, { weight: event.target.value })
                                }
                                onBlur={() => log && void persist(log)}
                              />

                              {isTimeRow ? (
                                <TimerCell
                                  targetSeconds={targetSeconds(block.target) ?? 60}
                                  value={secondsValue}
                                  onChange={(value) => patchDraft(key, { seconds: value })}
                                />
                              ) : (
                                <input
                                  className="input input--center"
                                  inputMode="numeric"
                                  placeholder="—"
                                  aria-label={`Repetições da série ${setIndex + 1}`}
                                  value={repsValue}
                                  onChange={(event) =>
                                    patchDraft(key, { reps: event.target.value })
                                  }
                                  onBlur={() => log && void persist(log)}
                                />
                              )}

                              <button
                                type="button"
                                className={log ? 'check-btn is-done' : 'check-btn'}
                                aria-label={
                                  log
                                    ? `Desfazer série ${setIndex + 1}`
                                    : `Concluir série ${setIndex + 1}`
                                }
                                aria-pressed={!!log}
                                onClick={() => {
                                  if (log) void deleteSetLog(log.id)
                                  else void persist(undefined)
                                }}
                              >
                                <CheckIcon />
                              </button>

                              <button
                                type="button"
                                className={
                                  noteValue ? 'note-btn has-note' : 'note-btn'
                                }
                                aria-label={`Observação da série ${setIndex + 1}`}
                                aria-expanded={noteOpen}
                                onClick={() =>
                                  setOpenNotes((current) => ({
                                    ...current,
                                    [key]: !current[key],
                                  }))
                                }
                              >
                                <NoteIcon />
                              </button>
                            </div>

                            {noteOpen && (
                              <input
                                className="input set-note"
                                value={noteValue}
                                placeholder="Observação da série"
                                aria-label={`Texto da observação da série ${setIndex + 1}`}
                                onChange={(event) =>
                                  patchDraft(key, { note: event.target.value })
                                }
                                onBlur={() => log && void persist(log)}
                              />
                            )}
                          </div>
                        )
                      })}

                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        style={{ marginTop: 8 }}
                        onClick={() =>
                          setExtraSets((current) => ({
                            ...current,
                            [block.id]: (current[block.id] ?? 0) + 1,
                          }))
                        }
                      >
                        <PlusIcon width={16} height={16} /> Série extra
                      </button>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>

        {rows.length > 0 && (
          <div className="stack" style={{ marginTop: 22 }}>
            <button
              type="button"
              className="btn btn--block btn--primary"
              onClick={() => void handleFinish()}
            >
              Finalizar treino
            </button>
            <button
              type="button"
              className="btn btn--block btn--ghost"
              onClick={() => setConfirmDiscard(true)}
            >
              Descartar sessão
            </button>
          </div>
        )}
      </div>

      {confirmDiscard && (
        <ConfirmDialog
          title="Descartar sessão"
          message="Tudo o que foi registrado nesta sessão será apagado. Os pesos anteriores continuam no histórico."
          confirmLabel="Descartar"
          danger
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={async () => {
            if (sessionId) await discardSession(sessionId)
            navigate('/', { replace: true })
          }}
        />
      )}
    </>
  )
}
