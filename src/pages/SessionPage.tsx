import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import {
  db,
  DEFAULT_CARDIO_FIELDS,
  type CardioField,
  type Exercise,
  type SetBlock,
  type SetLog,
  type WorkoutItem,
} from '../db/db'
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
import { CardioSetRow, type CardioDraft } from '../components/CardioSetRow'
import { ExercisePhoto } from '../components/ExercisePhoto'
import { ChartIcon, CheckIcon, NoteIcon, PlusIcon, VideoIcon } from '../components/icons'
import { openExternal } from '../lib/image'
import {
  formatBlockLabel,
  formatBlockPlan,
  formatCardioLog,
  formatRest,
  formatSeconds,
  formatWeight,
  parseNumber,
  targetReps,
  targetSeconds,
} from '../lib/format'

type Draft = Partial<Record<CardioField | 'weight' | 'reps' | 'note', string>>
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
  // Só guardam o que o usuário abriu/fechou na mão; o resto é derivado do
  // progresso, o que faz o bloco concluído fechar e o próximo abrir sozinho.
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({})
  const [openExercises, setOpenExercises] = useState<Record<string, boolean>>({})

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
        <PageHeader title="Sessão" back backTo="/" backLabel="Treinos" />
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

  const isBlockDone = (block: SetBlock) =>
    logs.filter((log) => log.blockId === block.id).length >= setCountOf(block)

  const isExerciseDone = (row: Row) =>
    row.blocks.length > 0 && row.blocks.every(isBlockDone)

  // O primeiro bloco ainda incompleto do treino é o que fica aberto por padrão:
  // ao concluir um bloco, ele sai daqui e o seguinte assume — sem estado extra.
  const currentBlockId = rows
    .flatMap((row) => row.blocks)
    .find((block) => !isBlockDone(block))?.id

  const isBlockOpen = (block: SetBlock) =>
    openBlocks[block.id] ?? block.id === currentBlockId

  const isExerciseOpen = (row: Row) =>
    openExercises[row.item.id] ?? !isExerciseDone(row)

  /** Resumo do bloco fechado: "42,5 kg × 10, 10" ou "1:00, 0:45". */
  function summarize(block: SetBlock): string {
    const blockLogs = logs
      .filter((log) => log.blockId === block.id)
      .sort((a, b) => a.setIndex - b.setIndex)

    if (blockLogs.length === 0) return 'nada registrado'

    if (block.target.kind === 'cardio') {
      return blockLogs.map((log) => formatCardioLog(log)).join(' · ')
    }

    if (block.target.kind === 'time') {
      return blockLogs.map((log) => formatSeconds(log.seconds ?? 0)).join(', ')
    }

    const weights = [...new Set(blockLogs.map((log) => log.weight ?? 0))]
    const reps = blockLogs.map((log) => log.reps ?? 0).join(', ')

    return weights.length === 1
      ? `${formatWeight(weights[0])} × ${reps}`
      : blockLogs.map((log) => `${formatWeight(log.weight)} × ${log.reps ?? 0}`).join(' · ')
  }

  async function handleLeave() {
    // Entrou por engano e não registrou nada: não deixa sessão fantasma na home.
    if (sessionId && logs.length === 0) await discardSession(sessionId)
    navigate('/')
  }

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
        backLabel="Treinos"
        onBack={() => void handleLeave()}
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

            const done = isExerciseDone(row)
            const expanded = isExerciseOpen(row)

            return (
              <section key={item.id} className="card">
                <div className="row row--between">
                  <button
                    type="button"
                    className="collapse-head"
                    aria-expanded={expanded}
                    onClick={() =>
                      setOpenExercises((current) => ({
                        ...current,
                        [item.id]: !expanded,
                      }))
                    }
                  >
                    <span className={expanded ? 'caret is-open' : 'caret'}>›</span>
                    <ExercisePhoto photo={exercise.photo} name={exercise.name} />
                    <span className="card__title">{exercise.name}</span>
                    {done && <span className="chip chip--accent">concluído</span>}
                  </button>
                  <div className="row" style={{ gap: 2 }}>
                    {exercise.videoUrl && (
                      <button
                        type="button"
                        className="btn btn--icon btn--ghost"
                        aria-label={`Ver vídeo de ${exercise.name}`}
                        onClick={() => openExternal(exercise.videoUrl!)}
                      >
                        <VideoIcon />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--icon btn--ghost"
                      aria-label={`Ver evolução de ${exercise.name}`}
                      onClick={() =>
                        navigate(`/exercicios/${exercise.id}`, {
                          state: { from: `/sessao/${session.id}`, label: 'Treino' },
                        })
                      }
                    >
                      <ChartIcon />
                    </button>
                  </div>
                </div>

                {!expanded && (
                  <p className="hint" style={{ margin: '4px 0 0 22px' }}>
                    {blocks.filter(isBlockDone).length} de {blocks.length} blocos feitos
                  </p>
                )}

                {expanded && suggestion && !dismissed[item.exerciseId] && (
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

                {expanded && blocks.length === 0 && (
                  <p className="hint">
                    Este exercício não tem blocos configurados. Edite o treino para
                    montá-los.
                  </p>
                )}

                {expanded && blocks.map((block) => {
                  const isTimeRow = block.target.kind === 'time'
                  const isCardioRow = block.target.kind === 'cardio'
                  const cardioFields = exercise.cardioFields ?? DEFAULT_CARDIO_FIELDS
                  const last = lastByBlock.get(block.id)
                  const fallback = lastByExercise.get(item.exerciseId)
                  const rest = formatRest(block)
                  const blockLogs = logs.filter((log) => log.blockId === block.id)

                  // Peso sugerido: o da série anterior deste bloco, senão o último
                  // registrado no bloco, senão o último do exercício.
                  let carryWeight = toInput((last ?? fallback)?.weight)

                  const blockDone = isBlockDone(block)
                  const blockOpen = isBlockOpen(block)

                  return (
                    <div key={block.id} className={`block block--${block.kind}`}>
                      <button
                        type="button"
                        className="collapse-head"
                        aria-expanded={blockOpen}
                        onClick={() =>
                          setOpenBlocks((current) => ({
                            ...current,
                            [block.id]: !blockOpen,
                          }))
                        }
                      >
                        <span className={blockOpen ? 'caret is-open' : 'caret'}>›</span>
                        <span className="block__title">
                          {formatBlockLabel(block, blocks)}
                        </span>
                        {blockDone && <CheckIcon className="block__check" />}
                      </button>

                      {!blockOpen ? (
                        <div className="block__meta" style={{ marginLeft: 22 }}>
                          {blockDone
                            ? summarize(block)
                            : `${blockLogs.length} de ${setCountOf(block)} · ${formatBlockPlan(block)}`}
                        </div>
                      ) : (
                        <>
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

                      {!isCardioRow && (
                        <div className={isTimeRow ? 'set-heads set-heads--time' : 'set-heads'}>
                          <span />
                          <span>Peso (kg)</span>
                          <span>{isTimeRow ? 'Tempo (s)' : 'Reps'}</span>
                          <span />
                          <span />
                        </div>
                      )}

                      {isCardioRow &&
                        Array.from({ length: setCountOf(block) }, (_, setIndex) => {
                          const key = rowKey(block.id, setIndex)
                          const log = blockLogs.find((entry) => entry.setIndex === setIndex)
                          const draft = drafts[key] ?? {}
                          const prescribed =
                            block.target.kind === 'cardio' ? block.target : undefined

                          const fromTarget = (field: CardioField) => {
                            switch (field) {
                              case 'seconds':
                                return prescribed?.seconds
                              case 'distance':
                                return prescribed?.distance
                              case 'speed':
                                return prescribed?.speed
                              case 'incline':
                                return prescribed?.incline
                              case 'resistance':
                                return prescribed?.resistance
                              default:
                                return undefined
                            }
                          }

                          // Vale o que foi digitado, depois o registrado, depois o
                          // prescrito e por fim o que se fez da última vez.
                          const values: CardioDraft = {}
                          for (const field of cardioFields) {
                            values[field] =
                              draft[field] ??
                              (log
                                ? toInput(log[field])
                                : toInput(fromTarget(field) ?? last?.[field]))
                          }

                          const noteValue = draft.note ?? log?.note ?? ''
                          const persistCardio = (existing: SetLog | undefined) =>
                            saveSetLog({
                              id: existing?.id,
                              sessionId: session.id,
                              exerciseId: item.exerciseId,
                              workoutItemId: item.id,
                              blockId: block.id,
                              setIndex,
                              seconds: parseNumber(values.seconds ?? ''),
                              distance: parseNumber(values.distance ?? ''),
                              speed: parseNumber(values.speed ?? ''),
                              incline: parseNumber(values.incline ?? ''),
                              resistance: parseNumber(values.resistance ?? ''),
                              heartRate: parseNumber(values.heartRate ?? ''),
                              calories: parseNumber(values.calories ?? ''),
                              note: noteValue,
                            })

                          return (
                            <CardioSetRow
                              key={key}
                              setIndex={setIndex}
                              block={block}
                              fields={cardioFields}
                              values={values}
                              done={!!log}
                              noteValue={noteValue}
                              noteOpen={openNotes[key] || noteValue.length > 0}
                              onChange={(field, value) => patchDraft(key, { [field]: value })}
                              onFieldBlur={() => log && void persistCardio(log)}
                              onToggleDone={() => {
                                if (log) void deleteSetLog(log.id)
                                else void persistCardio(undefined)
                              }}
                              onToggleNote={() =>
                                setOpenNotes((current) => ({ ...current, [key]: !current[key] }))
                              }
                              onNoteChange={(value) => patchDraft(key, { note: value })}
                              onNoteBlur={() => log && void persistCardio(log)}
                            />
                          )
                        })}

                      {!isCardioRow &&
                        Array.from({ length: setCountOf(block) }, (_, setIndex) => {
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
                        </>
                      )}
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
