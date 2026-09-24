import { CheckIcon } from './icons'
import { formatGrams } from '../lib/format'
import { goalGap } from '../lib/nutrition'

interface Props {
  label: string
  total: number
  goal: number
  /**
   * Como a meta é julgada. `piso` é a proteína: bater é o mínimo e passar é
   * bom. `alvo` é carboidrato e gordura: a dieta prescreve um total, e ficar
   * aquém ou passar dele são os dois desvios.
   */
  mode: 'piso' | 'alvo'
}

/**
 * Um macro do dia no card de nutrição: quanto foi, quanto é a meta, o quanto
 * falta e a barra. Existe porque proteína, carboidrato e gordura seriam três
 * blocos de JSX idênticos a menos de duas palavras.
 *
 * As calorias ficam de fora de propósito: são faixa, com dois números na
 * meta, e caberiam aqui só à custa de um caso especial dentro do componente.
 */
export function MacroGoalRow({ label, total, goal, mode }: Props) {
  // Piso passa só o mínimo; alvo passa o mesmo número dos dois lados, e é isso
  // que faz o `goalGap` acusar tanto o que falta quanto o que passou.
  const gap = mode === 'piso' ? goalGap(total, goal) : goalGap(total, goal, goal)
  const pisoAlcancado = mode === 'piso' && gap.status !== 'abaixo'

  return (
    <div className="card__split">
      <div className="row row--between">
        <div style={{ minWidth: 0 }}>
          {/* O rótulo é necessário aqui e não no bloco de calorias: "kcal" já
              diz do que se trata, "g" sozinho não diria. */}
          <div className="card__title">
            {label}: {formatGrams(total)} de {formatGrams(goal)}
          </div>
          <div className="card__meta">
            {gap.status === 'abaixo'
              ? `faltam ${formatGrams(gap.amount)}`
              : gap.status === 'acima'
                ? `${formatGrams(gap.amount)} acima do alvo`
                : mode === 'piso'
                  ? 'piso alcançado'
                  : 'no alvo'}
          </div>
        </div>
        {/* Só o piso ganha chip. Num alvo, "dentro" exigiria o total cair no
            valor exato da meta, o que com nutrição estimada não acontece — um
            chip que nunca acende é ruído. */}
        {pisoAlcancado && (
          <span className="chip chip--accent">
            <CheckIcon width={14} height={14} /> meta batida
          </span>
        )}
      </div>

      <div className="progress" style={{ marginTop: 10 }}>
        <div
          className={pisoAlcancado ? 'progress__fill is-done' : 'progress__fill'}
          style={{ width: `${goal > 0 ? Math.min(100, (total / goal) * 100) : 0}%` }}
        />
      </div>
    </div>
  )
}
