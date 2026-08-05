import { useState } from 'react'
import {
  DEFAULT_CARDIO_FIELDS,
  type BlockKind,
  type CardioField,
  type Exercise,
  type SetBlock,
  type Target,
} from '../db/db'
import { BLOCK_LABELS, CARDIO_LABELS, parseNumber } from '../lib/format'
import { Modal } from './Modal'

/** FC e calorias são resultado, não prescrição — não entram no alvo do bloco. */
const CARDIO_TARGET_FIELDS: CardioField[] = [
  'seconds',
  'distance',
  'speed',
  'incline',
  'resistance',
]

/** Número para input com vírgula, como o teclado brasileiro digita. */
function toInput(value: number): string {
  return String(value).replace('.', ',')
}

type TargetMode = 'repsRange' | 'reps' | 'time'

export interface BlockFormData {
  kind: BlockKind
  label?: string
  sets: number
  target: Target
  restSeconds?: number
  restSecondsMax?: number
  note?: string
}

interface Props {
  exercise: Exercise
  /** Bloco existente; ausente significa que está sendo criado agora. */
  block?: SetBlock
  initial?: Partial<BlockFormData>
  onSave: (data: BlockFormData) => void
  onClose: () => void
  onRemove?: () => void
}

const KIND_ORDER: BlockKind[] = [
  'warmup',
  'feeder',
  'working',
  'top',
  'backoff',
  'drop',
  'amrap',
  'interval',
]

const REST_PRESETS = [30, 60, 90, 120, 180]

function minutesLabel(seconds: number): string {
  return seconds % 60 === 0 ? `${seconds / 60}min` : `${seconds}s`
}

export function SetBlockModal({
  exercise,
  block,
  initial,
  onSave,
  onClose,
  onRemove,
}: Props) {
  const seed = block ?? initial
  const isTimeExercise = exercise.kind === 'time'
  const isCardio = exercise.kind === 'cardio'
  const cardioFields = exercise.cardioFields ?? DEFAULT_CARDIO_FIELDS

  const [kind, setKind] = useState<BlockKind>(
    seed?.kind ?? (isCardio ? 'interval' : 'working'),
  )
  const [label, setLabel] = useState(seed?.label ?? '')
  // Um trecho aeróbico é executado uma vez; repetir é criar outro trecho.
  const [sets, setSets] = useState(seed?.sets ?? (isCardio ? 1 : 2))
  const [note, setNote] = useState(seed?.note ?? '')

  const seedMode = seed?.target?.kind
  const [mode, setMode] = useState<TargetMode>(
    isTimeExercise || seedMode === 'cardio'
      ? 'time'
      : (seedMode ?? 'repsRange'),
  )
  const target = seed?.target
  const [reps, setReps] = useState(target?.kind === 'reps' ? target.value : 10)
  const [min, setMin] = useState(target?.kind === 'repsRange' ? target.min : 8)
  const [max, setMax] = useState(target?.kind === 'repsRange' ? target.max : 10)
  const [seconds, setSeconds] = useState(target?.kind === 'time' ? target.seconds : 60)

  // Prescrição aeróbica: cada campo é opcional e vazio significa "livre".
  const cardio = target?.kind === 'cardio' ? target : undefined
  const [cardioValues, setCardioValues] = useState<Record<string, string>>({
    seconds: cardio?.seconds ? String(cardio.seconds / 60) : isCardio ? '4' : '',
    distance: cardio?.distance ? toInput(cardio.distance) : '',
    speed: cardio?.speed ? toInput(cardio.speed) : '',
    incline: cardio?.incline ? toInput(cardio.incline) : '',
    resistance: cardio?.resistance ? toInput(cardio.resistance) : '',
  })

  const [rest, setRest] = useState<number | undefined>(
    seed?.restSeconds ?? (isCardio ? undefined : 120),
  )
  const [restMax, setRestMax] = useState<number | undefined>(seed?.restSecondsMax)

  function buildTarget(): Target {
    if (isCardio) {
      const minutes = parseNumber(cardioValues.seconds ?? '')
      return {
        kind: 'cardio',
        seconds: minutes ? Math.round(minutes * 60) : undefined,
        distance: parseNumber(cardioValues.distance ?? ''),
        speed: parseNumber(cardioValues.speed ?? ''),
        incline: parseNumber(cardioValues.incline ?? ''),
        resistance: parseNumber(cardioValues.resistance ?? ''),
      }
    }
    if (isTimeExercise || mode === 'time') {
      return { kind: 'time', seconds: Math.max(1, seconds) }
    }
    if (mode === 'reps') return { kind: 'reps', value: Math.max(1, reps) }
    return {
      kind: 'repsRange',
      min: Math.max(1, Math.min(min, max)),
      max: Math.max(1, Math.max(min, max)),
    }
  }

  function handleSave() {
    onSave({
      kind,
      label: label.trim() || undefined,
      sets: Math.max(1, sets),
      target: buildTarget(),
      restSeconds: rest,
      // Guardar um máximo igual ao mínimo só polui a exibição do intervalo.
      restSecondsMax: restMax !== undefined && rest !== undefined && restMax > rest
        ? restMax
        : undefined,
      note: note.trim() || undefined,
    })
  }

  return (
    <Modal
      title={block ? 'Editar bloco' : 'Novo bloco'}
      onClose={onClose}
      actions={
        <>
          {onRemove ? (
            <button type="button" className="btn btn--danger" onClick={onRemove}>
              Remover
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={handleSave}>
            {block ? 'Salvar' : 'Adicionar'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <span className="field__label">Tipo</span>
          <div className="chip-grid">
            {KIND_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                className={option === kind ? 'chip-option is-active' : 'chip-option'}
                aria-pressed={option === kind}
                onClick={() => setKind(option)}
              >
                {BLOCK_LABELS[option]}
              </button>
            ))}
          </div>
          <span className="hint">
            {kind === 'working' || kind === 'top'
              ? 'Conta para a sugestão de aumento de carga.'
              : 'Não entra no critério de progressão.'}
          </span>
        </div>

        <div className="field">
          <span className="field__label">Séries</span>
          <div className="row">
            <button
              type="button"
              className="btn btn--icon"
              aria-label="Menos uma série"
              onClick={() => setSets((value) => Math.max(1, value - 1))}
            >
              −
            </button>
            <input
              className="input input--center"
              inputMode="numeric"
              value={sets}
              onChange={(event) => setSets(Number(event.target.value) || 1)}
            />
            <button
              type="button"
              className="btn btn--icon"
              aria-label="Mais uma série"
              onClick={() => setSets((value) => value + 1)}
            >
              +
            </button>
          </div>
        </div>

        {!isTimeExercise && !isCardio && (
          <div className="field">
            <span className="field__label">Alvo</span>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={mode === 'repsRange'}
                onClick={() => setMode('repsRange')}
              >
                Faixa
              </button>
              <button
                type="button"
                aria-pressed={mode === 'reps'}
                onClick={() => setMode('reps')}
              >
                Fixo
              </button>
              <button
                type="button"
                aria-pressed={mode === 'time'}
                onClick={() => setMode('time')}
              >
                Tempo
              </button>
            </div>
          </div>
        )}

        {!isTimeExercise && !isCardio && mode ==='repsRange' && (
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="block-min">
                Mínimo
              </label>
              <input
                id="block-min"
                className="input input--center"
                inputMode="numeric"
                value={min}
                onChange={(event) => setMin(Number(event.target.value) || 0)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="block-max">
                Máximo
              </label>
              <input
                id="block-max"
                className="input input--center"
                inputMode="numeric"
                value={max}
                onChange={(event) => setMax(Number(event.target.value) || 0)}
              />
            </div>
          </div>
        )}

        {!isTimeExercise && !isCardio && mode ==='reps' && (
          <div className="field">
            <label className="field__label" htmlFor="block-reps">
              Repetições
            </label>
            <input
              id="block-reps"
              className="input input--center"
              inputMode="numeric"
              value={reps}
              onChange={(event) => setReps(Number(event.target.value) || 0)}
            />
          </div>
        )}

        {!isCardio && (isTimeExercise || mode === 'time') && (
          <div className="field">
            <label className="field__label" htmlFor="block-seconds">
              Tempo por série (segundos)
            </label>
            <input
              id="block-seconds"
              className="input input--center"
              inputMode="numeric"
              value={seconds}
              onChange={(event) => setSeconds(Number(event.target.value) || 0)}
            />
          </div>
        )}

        {isCardio && (
          <div className="field">
            <span className="field__label">Prescrição do trecho</span>
            <div className="cardio-grid">
              {CARDIO_TARGET_FIELDS.filter((f) => cardioFields.includes(f)).map((field) => (
                <label key={field} className="cardio-field">
                  <span className="cardio-field__label">
                    {field === 'seconds' ? 'Tempo (min)' : CARDIO_LABELS[field].short}
                    {field !== 'seconds' && ` (${CARDIO_LABELS[field].unit})`}
                  </span>
                  <input
                    className="input input--center"
                    inputMode="decimal"
                    placeholder="—"
                    value={cardioValues[field] ?? ''}
                    onChange={(event) =>
                      setCardioValues((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <span className="hint">
              Deixe vazio o que for livre. Só aparecem as métricas marcadas no cadastro
              do exercício.
            </span>
          </div>
        )}

        <div className="field">
          <span className="field__label">Intervalo entre séries</span>
          <div className="chip-grid">
            <button
              type="button"
              className={rest === undefined ? 'chip-option is-active' : 'chip-option'}
              aria-pressed={rest === undefined}
              onClick={() => {
                setRest(undefined)
                setRestMax(undefined)
              }}
            >
              Sem intervalo
            </button>
            {REST_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={rest === preset ? 'chip-option is-active' : 'chip-option'}
                aria-pressed={rest === preset}
                onClick={() => setRest(preset)}
              >
                {minutesLabel(preset)}
              </button>
            ))}
          </div>

          {rest !== undefined && (
            <>
              <label className="field__label" htmlFor="block-rest-max" style={{ marginTop: 8 }}>
                Até (opcional) — vira "{minutesLabel(rest)} a {minutesLabel(restMax ?? rest)}"
              </label>
              <div className="chip-grid">
                <button
                  type="button"
                  className={restMax === undefined ? 'chip-option is-active' : 'chip-option'}
                  aria-pressed={restMax === undefined}
                  onClick={() => setRestMax(undefined)}
                >
                  Exato
                </button>
                {REST_PRESETS.filter((preset) => preset > rest).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    id={preset === REST_PRESETS[0] ? 'block-rest-max' : undefined}
                    className={restMax === preset ? 'chip-option is-active' : 'chip-option'}
                    aria-pressed={restMax === preset}
                    onClick={() => setRestMax(preset)}
                  >
                    {minutesLabel(preset)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="block-label">
            Nome do bloco (opcional)
          </label>
          <input
            id="block-label"
            className="input"
            value={label}
            placeholder={BLOCK_LABELS[kind]}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="block-note">
            Observação
          </label>
          <input
            id="block-note"
            className="input"
            value={note}
            placeholder="carga moderada"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
