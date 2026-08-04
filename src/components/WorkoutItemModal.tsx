import { useState } from 'react'
import type { Exercise, Target, WorkoutItem } from '../db/db'
import { Modal } from './Modal'

type TargetMode = 'reps' | 'repsRange' | 'time'

interface Props {
  exercise: Exercise
  /** Item existente; ausente significa que está sendo adicionado agora. */
  item?: WorkoutItem
  onSave: (data: { sets: number; target: Target }) => void
  onClose: () => void
  onRemove?: () => void
}

function initialMode(exercise: Exercise, item?: WorkoutItem): TargetMode {
  if (item) return item.target.kind
  return exercise.kind === 'time' ? 'time' : 'repsRange'
}

export function WorkoutItemModal({ exercise, item, onSave, onClose, onRemove }: Props) {
  const [sets, setSets] = useState(item?.sets ?? 3)
  const [mode, setMode] = useState<TargetMode>(initialMode(exercise, item))

  const target = item?.target
  const [reps, setReps] = useState(target?.kind === 'reps' ? target.value : 12)
  const [min, setMin] = useState(target?.kind === 'repsRange' ? target.min : 8)
  const [max, setMax] = useState(target?.kind === 'repsRange' ? target.max : 12)
  const [seconds, setSeconds] = useState(target?.kind === 'time' ? target.seconds : 60)

  // Exercícios de tempo só aceitam alvo de tempo, e vice-versa.
  const isTime = exercise.kind === 'time'

  function buildTarget(): Target {
    if (isTime || mode === 'time') return { kind: 'time', seconds: Math.max(1, seconds) }
    if (mode === 'reps') return { kind: 'reps', value: Math.max(1, reps) }
    return {
      kind: 'repsRange',
      min: Math.max(1, Math.min(min, max)),
      max: Math.max(1, Math.max(min, max)),
    }
  }

  return (
    <Modal
      title={exercise.name}
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
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onSave({ sets: Math.max(1, sets), target: buildTarget() })}
          >
            {item ? 'Salvar' : 'Adicionar'}
          </button>
        </>
      }
    >
      <div className="stack">
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

        {!isTime && (
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

        {!isTime && mode === 'repsRange' && (
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="rep-min">
                Mínimo
              </label>
              <input
                id="rep-min"
                className="input input--center"
                inputMode="numeric"
                value={min}
                onChange={(event) => setMin(Number(event.target.value) || 0)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="rep-max">
                Máximo
              </label>
              <input
                id="rep-max"
                className="input input--center"
                inputMode="numeric"
                value={max}
                onChange={(event) => setMax(Number(event.target.value) || 0)}
              />
            </div>
          </div>
        )}

        {!isTime && mode === 'reps' && (
          <div className="field">
            <label className="field__label" htmlFor="rep-value">
              Repetições
            </label>
            <input
              id="rep-value"
              className="input input--center"
              inputMode="numeric"
              value={reps}
              onChange={(event) => setReps(Number(event.target.value) || 0)}
            />
          </div>
        )}

        {(isTime || mode === 'time') && (
          <div className="field">
            <label className="field__label" htmlFor="target-seconds">
              Tempo por série (segundos)
            </label>
            <input
              id="target-seconds"
              className="input input--center"
              inputMode="numeric"
              value={seconds}
              onChange={(event) => setSeconds(Number(event.target.value) || 0)}
            />
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {[30, 45, 60, 90, 120].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => setSeconds(preset)}
                >
                  {preset}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
