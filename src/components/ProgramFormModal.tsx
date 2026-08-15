import { useState } from 'react'
import type { Cycle, Program } from '../db/db'
import { Modal } from './Modal'

type CycleMode = 'none' | 'date' | 'sessions'

interface Props {
  /** Programa em edição; ausente cria um novo. */
  program?: Program
  /** Rótulo do botão de confirmação, para "Duplicar" reusar este formulário. */
  confirmLabel?: string
  title?: string
  onSave: (data: { name: string; cycle?: Cycle }) => void
  onClose: () => void
}

/** Data local em YYYY-MM-DD, formato que o input[type=date] espera. */
function toDateInput(ts: number): string {
  const date = new Date(ts)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(ts - offset).toISOString().slice(0, 10)
}

function defaultUntil(): string {
  return toDateInput(Date.now() + 56 * 86400000) // 8 semanas
}

export function ProgramFormModal({
  program,
  confirmLabel = 'Salvar',
  title,
  onSave,
  onClose,
}: Props) {
  const [name, setName] = useState(program?.name ?? '')
  const [mode, setMode] = useState<CycleMode>(program?.cycle?.kind ?? 'none')
  const [until, setUntil] = useState(
    program?.cycle?.kind === 'date' ? toDateInput(program.cycle.until) : defaultUntil(),
  )
  const [target, setTarget] = useState(
    program?.cycle?.kind === 'sessions' ? program.cycle.target : 12,
  )

  function buildCycle(): Cycle | undefined {
    if (mode === 'date') {
      // Fim do dia escolhido, senão o ciclo "vence" já pela manhã.
      const until23h59 = new Date(`${until}T23:59:59`).getTime()
      return Number.isFinite(until23h59) ? { kind: 'date', until: until23h59 } : undefined
    }
    if (mode === 'sessions') return { kind: 'sessions', target: Math.max(1, target) }
    return undefined
  }

  return (
    <Modal
      title={title ?? (program ? 'Editar programa' : 'Novo programa')}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!name.trim()}
            onClick={() => onSave({ name, cycle: buildCycle() })}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="program-name">
            Nome
          </label>
          <input
            id="program-name"
            className="input"
            value={name}
            autoFocus={!program}
            placeholder="Treino de Agosto"
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <span className="field__label">Duração do ciclo</span>
          <div className="segmented">
            <button type="button" aria-pressed={mode === 'none'} onClick={() => setMode('none')}>
              Sem fim
            </button>
            <button
              type="button"
              aria-pressed={mode === 'sessions'}
              onClick={() => setMode('sessions')}
            >
              Sessões
            </button>
            <button type="button" aria-pressed={mode === 'date'} onClick={() => setMode('date')}>
              Data
            </button>
          </div>
          <span className="hint">
            O app avisa quando o ciclo termina, mas nunca impede de treinar.
          </span>
        </div>

        {mode === 'sessions' && (
          <div className="field">
            <label className="field__label" htmlFor="program-target">
              Quantas sessões no programa todo
            </label>
            <input
              id="program-target"
              className="input input--center"
              inputMode="numeric"
              value={target}
              onChange={(event) => setTarget(Number(event.target.value) || 0)}
            />
            <span className="hint">
              Conta as sessões de todos os treinos desta bateria, somadas.
            </span>
          </div>
        )}

        {mode === 'date' && (
          <div className="field">
            <label className="field__label" htmlFor="program-until">
              Válido até
            </label>
            <input
              id="program-until"
              className="input"
              type="date"
              value={until}
              onChange={(event) => setUntil(event.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
