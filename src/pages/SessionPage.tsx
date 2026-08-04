import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db, type Exercise, type SetLog, type WorkoutItem } from '../db/db'
import { deleteSetLog, discardSession, finishSession, saveSetLog } from '../db/actions'
import { getLastSetsForExercises } from '../db/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/Modal'
import { TimerCell } from '../components/TimerCell'
import { CheckIcon, PlusIcon } from '../components/icons'
import {
  formatItemPlan,
  formatSeconds,
  formatWeight,
  parseNumber,
  targetReps,
  targetSeconds,
} from '../lib/format'

type Draft = { weight?: string; reps?: string; seconds?: string }
type Drafts = Record<string, Draft>

const rowKey = (itemId: string, setIndex: number) => `${itemId}#${setIndex}`

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
    const rows = items
      .map((item, index) => ({ item, exercise: exercises[index] }))
      .filter((row): row is { item: WorkoutItem; exercise: Exercise } => !!row.exercise)

    const logs = await db.setLogs.where('sessionId').equals(sessionId).toArray()
    const lastSets = await getLastSetsForExercises(
      [...new Set(rows.map((r) => r.item.exerciseId))],
      sessionId,
    )

    return { session, rows, logs, lastSets }
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

  const { session, rows, logs, lastSets } = data
  const totalPlanned = rows.reduce(
    (sum, { item }) => sum + Math.max(item.sets, 0) + (extraSets[item.id] ?? 0),
    0,
  )

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
          <button type="button" className="btn btn--sm btn--primary" onClick={() => void handleFinish()}>
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
          {rows.map(({ item, exercise }) => {
            const itemLogs = logs.filter((log) => log.workoutItemId === item.id)
            const maxIndex = itemLogs.reduce((max, log) => Math.max(max, log.setIndex), -1)
            const setCount = Math.max(item.sets, maxIndex + 1) + (extraSets[item.id] ?? 0)
            const isTimeRow = item.target.kind === 'time'
            const last = lastSets.get(item.exerciseId)

            // Peso sugerido: o da série anterior desta sessão, senão o último
            // registrado para o exercício em qualquer treino.
            let carryWeight = toInput(last?.weight)

            return (
              <section key={item.id} className="card">
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
                    onClick={() => navigate(`/exercicios/${exercise.id}`)}
                  >
                    <div className="card__title">{exercise.name}</div>
                    <div className="card__meta">{formatItemPlan(item)}</div>
                  </button>
                </div>

                <p className="hint" style={{ margin: '6px 0 10px' }}>
                  {last
                    ? `Último: ${formatWeight(last.weight)}${
                        last.reps ? ` × ${last.reps}` : ''
                      }${last.seconds ? ` · ${formatSeconds(last.seconds)}` : ''}`
                    : 'Primeira vez registrando este exercício.'}
                </p>

                <div className={isTimeRow ? 'set-heads set-heads--time' : 'set-heads'}>
                  <span />
                  <span>Peso (kg)</span>
                  <span>{isTimeRow ? 'Tempo (s)' : 'Reps'}</span>
                  <span />
                </div>

                {Array.from({ length: setCount }, (_, setIndex) => {
                  const key = rowKey(item.id, setIndex)
                  const log = itemLogs.find((entry) => entry.setIndex === setIndex)
                  const draft = drafts[key] ?? {}

                  const weightValue =
                    draft.weight ?? (log ? toInput(log.weight) : carryWeight)
                  const repsValue =
                    draft.reps ??
                    (log ? toInput(log.reps) : toInput(last?.reps ?? targetReps(item.target)))
                  const secondsValue =
                    draft.seconds ??
                    (log ? toInput(log.seconds) : toInput(targetSeconds(item.target)))

                  carryWeight = weightValue

                  const persist = (existing: SetLog | undefined) =>
                    saveSetLog({
                      id: existing?.id,
                      sessionId: session.id,
                      exerciseId: item.exerciseId,
                      workoutItemId: item.id,
                      setIndex,
                      weight: parseNumber(weightValue),
                      reps: isTimeRow ? undefined : parseNumber(repsValue),
                      seconds: isTimeRow ? parseNumber(secondsValue) : undefined,
                    })

                  return (
                    <div
                      key={key}
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
                        onChange={(event) => patchDraft(key, { weight: event.target.value })}
                        onBlur={() => log && void persist(log)}
                      />

                      {isTimeRow ? (
                        <TimerCell
                          targetSeconds={targetSeconds(item.target) ?? 60}
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
                          onChange={(event) => patchDraft(key, { reps: event.target.value })}
                          onBlur={() => log && void persist(log)}
                        />
                      )}

                      <button
                        type="button"
                        className={log ? 'check-btn is-done' : 'check-btn'}
                        aria-label={
                          log ? `Desfazer série ${setIndex + 1}` : `Concluir série ${setIndex + 1}`
                        }
                        aria-pressed={!!log}
                        onClick={() => {
                          if (log) void deleteSetLog(log.id)
                          else void persist(undefined)
                        }}
                      >
                        <CheckIcon />
                      </button>
                    </div>
                  )
                })}

                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  style={{ marginTop: 10 }}
                  onClick={() =>
                    setExtraSets((current) => ({
                      ...current,
                      [item.id]: (current[item.id] ?? 0) + 1,
                    }))
                  }
                >
                  <PlusIcon width={16} height={16} /> Série extra
                </button>
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
