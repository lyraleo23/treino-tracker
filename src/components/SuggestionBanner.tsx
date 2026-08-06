import { useState } from 'react'
import type { SetBlock } from '../db/db'
import type { ProgressionSuggestion } from '../db/queries'
import type { LadderEntry } from '../lib/ladder'
import { formatBlockLabel, formatNumber } from '../lib/format'

interface Props {
  suggestion: ProgressionSuggestion
  /** Incremento de carga do exercício, em kg. */
  step: number
  /** Monta a escada para um deslocamento da âncora. */
  preview: (delta: number) => LadderEntry[]
  blocks: SetBlock[]
  onApply: (entries: LadderEntry[]) => void
  onDismiss: () => void
}

/**
 * Mostra o que a sugestão faria com cada bloco antes de aplicar. Nada muda
 * sozinho: quem escreve as cargas é o botão, e depois tudo segue editável.
 */
export function SuggestionBanner({
  suggestion,
  step,
  preview,
  blocks,
  onApply,
  onDismiss,
}: Props) {
  // Os deslocamentos possíveis: um passo e dois passos, no sentido da sugestão.
  const deltas =
    suggestion.kind === 'subir'
      ? [step, step * 2]
      : suggestion.kind === 'descer'
        ? [-step, -step * 2]
        : [0]

  const [selected, setSelected] = useState(deltas[0]!)
  const entries = preview(selected).filter((entry) => entry.from !== entry.to)

  const label = (delta: number) =>
    delta === 0
      ? 'Ajustar cargas'
      : `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta))} kg`

  return (
    <div className={`banner banner--${suggestion.kind}`} style={{ marginTop: 10 }}>
      <div className="banner__text">
        <strong>{suggestion.title}</strong>
        {suggestion.reason}
      </div>

      {entries.length > 0 && (
        <ul className="proposal">
          {entries.map((entry) => (
            <li key={entry.block.id}>
              <span className="proposal__name">{formatBlockLabel(entry.block, blocks)}</span>
              <span className="proposal__from">
                {entry.from === undefined ? '—' : `${formatNumber(entry.from)}`}
              </span>
              <span className="proposal__arrow">→</span>
              <span className="proposal__to">{formatNumber(entry.to)} kg</span>
            </li>
          ))}
        </ul>
      )}

      {/* Escolher o tamanho do passo e aplicar são gestos diferentes: os chips
          só trocam a prévia acima; quem grava nos campos é o Aplicar. */}
      {deltas.length > 1 && (
        <div className="chip-grid" style={{ width: '100%' }}>
          {deltas.map((delta) => (
            <button
              key={delta}
              type="button"
              className={delta === selected ? 'chip-option is-active' : 'chip-option'}
              aria-pressed={delta === selected}
              onClick={() => setSelected(delta)}
            >
              {label(delta)}
            </button>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 6, width: '100%' }}>
        <button
          type="button"
          className="btn btn--sm btn--primary"
          style={{ flex: 1 }}
          onClick={() => onApply(preview(selected))}
        >
          {deltas.length > 1 ? `Aplicar ${label(selected)}` : label(selected)}
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={onDismiss}>
          Agora não
        </button>
      </div>
    </div>
  )
}
