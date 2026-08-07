import type { CardioField, SetBlock } from '../db/db'
import { CARDIO_LABELS, formatPace, parseNumber } from '../lib/format'
import { TimerCell } from './TimerCell'
import { CheckIcon, NoteIcon } from './icons'

export type CardioDraft = Partial<Record<CardioField, string>>

interface Props {
  setIndex: number
  block: SetBlock
  fields: CardioField[]
  values: CardioDraft
  done: boolean
  noteValue: string
  noteOpen: boolean
  onChange: (field: CardioField, value: string) => void
  onToggleDone: () => void
  onToggleNote: () => void
  onNoteChange: (value: string) => void
  onNoteBlur: () => void
  onFieldBlur: () => void
}

/**
 * Série de um trecho aeróbico. A grade de peso × reps não comporta cinco
 * métricas em 375px, então os campos ficam empilhados em duas colunas.
 */
export function CardioSetRow({
  setIndex,
  block,
  fields,
  values,
  done,
  noteValue,
  noteOpen,
  onChange,
  onToggleDone,
  onToggleNote,
  onNoteChange,
  onNoteBlur,
  onFieldBlur,
}: Props) {
  const targetSeconds =
    block.target.kind === 'cardio' ? block.target.seconds : undefined
  const pace = formatPace(parseNumber(values.speed ?? ''))

  return (
    <div className={done ? 'cardio-row is-done' : 'cardio-row'}>
      <div className="cardio-row__head">
        <span className="set-row__index">{setIndex + 1}</span>
        {pace && <span className="cardio-row__pace">{pace}</span>}
        <span className="spacer" />
        <button
          type="button"
          className={noteValue ? 'note-btn has-note' : 'note-btn'}
          aria-label={`Observação da série ${setIndex + 1}`}
          aria-expanded={noteOpen}
          onClick={onToggleNote}
        >
          <NoteIcon />
        </button>
        <button
          type="button"
          className={done ? 'check-btn is-done' : 'check-btn'}
          aria-label={done ? `Desfazer série ${setIndex + 1}` : `Concluir série ${setIndex + 1}`}
          aria-pressed={done}
          onClick={onToggleDone}
        >
          <CheckIcon />
        </button>
      </div>

      {/* O cronômetro ocupa a linha toda: sobra espaço para min : seg mais o
          botão, e as demais métricas dividem a grade sem ficar em meia linha. */}
      {fields.includes('seconds') && (
        <label className="cardio-field" style={{ marginBottom: 8 }}>
          <span className="cardio-field__label">{CARDIO_LABELS.seconds.short}</span>
          <TimerCell
            splitMinutes
            targetSeconds={targetSeconds ?? 60}
            value={values.seconds ?? ''}
            onChange={(value) => onChange('seconds', value)}
          />
        </label>
      )}

      <div className="cardio-grid">
        {fields
          .filter((field) => field !== 'seconds')
          .map((field) => (
            <label key={field} className="cardio-field">
              <span className="cardio-field__label">
                {CARDIO_LABELS[field].short} ({CARDIO_LABELS[field].unit})
              </span>
              <input
                className="input input--center"
                inputMode="decimal"
                placeholder="—"
                value={values[field] ?? ''}
                onChange={(event) => onChange(field, event.target.value)}
                onBlur={onFieldBlur}
              />
            </label>
          ))}
      </div>

      {noteOpen && (
        <input
          className="input set-note"
          style={{ margin: '8px 0 0', width: '100%' }}
          value={noteValue}
          placeholder="Observação da série"
          aria-label={`Texto da observação da série ${setIndex + 1}`}
          onChange={(event) => onNoteChange(event.target.value)}
          onBlur={onNoteBlur}
        />
      )}
    </div>
  )
}
