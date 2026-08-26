import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { Modal } from './Modal'
import { CheckIcon } from './icons'
import { formatKcal, normalizeSearchText } from '../lib/format'

interface Props {
  /** Já adicionados nesta refeição — marcados como ativos. */
  selectedIds: string[]
  /** Toque adiciona ou remove; não fecha o modal — é seleção múltipla. */
  onToggle: (foodId: string) => void
  onClose: () => void
}

/**
 * Escolhe alimentos do catálogo completo para uma refeição livre. Diferente
 * do `ExercisePicker` (seleção única, fecha ao escolher), este fica aberto
 * enquanto o usuário monta a lista — só fecha quando ele terminar.
 */
export function FoodPicker({ selectedIds, onToggle, onClose }: Props) {
  const [search, setSearch] = useState('')

  const foods = useLiveQuery(() => db.foods.filter((f) => f.archived === 0).toArray(), [])

  const filtered = useMemo(() => {
    if (!foods) return []
    const term = normalizeSearchText(search)
    return foods
      .filter((f) => !term || normalizeSearchText(f.name).includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [foods, search])

  return (
    <Modal
      title="Adicionar alimentos"
      onClose={onClose}
      actions={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Concluído
        </button>
      }
    >
      <div className="stack">
        <input
          className="input"
          type="search"
          value={search}
          autoFocus
          placeholder="Buscar alimento"
          onChange={(event) => setSearch(event.target.value)}
        />

        {filtered.length === 0 ? (
          <p className="hint" style={{ margin: '8px 0' }}>Nenhum alimento encontrado.</p>
        ) : (
          <div className="list">
            {filtered.map((food) => {
              const active = selectedIds.includes(food.id)
              return (
                <button
                  key={food.id}
                  type="button"
                  className="list__item"
                  onClick={() => onToggle(food.id)}
                >
                  <div className="list__main">
                    <div className="list__name">{food.name}</div>
                    <div className="list__meta">
                      {food.caloriesPerBaseUnit === null
                        ? 'estimativa indisponível'
                        : `${formatKcal(food.caloriesPerBaseUnit)} / ${food.baseUnit}`}
                    </div>
                  </div>
                  {active && (
                    <span className="chip chip--accent">
                      <CheckIcon width={14} height={14} /> adicionado
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
