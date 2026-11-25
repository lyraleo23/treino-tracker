import type { Exercise, SessionSwap } from '../db/db'
import { equivalentsOf, exerciseLabel, variantsOf } from '../lib/variants'
import { Modal } from './Modal'

interface Props {
  /** O exercício do treino, e a forma com que o treino o faz. */
  planned: Exercise
  plannedVariantId?: string
  /** O que está valendo agora — o planejado ou a troca já escolhida. */
  current: SessionSwap
  /** O catálogo inteiro, de onde saem os equivalentes. */
  exercises: Exercise[]
  /** Já há série registrada deste exercício na sessão? */
  hasLogs: boolean
  /** `null` volta ao planejado. */
  onPick: (swap: SessionSwap | null) => void
  onClose: () => void
}

interface Option {
  exercise: Exercise
  variantId?: string
}

/**
 * A "telinha de troca": outra forma de fazer o mesmo exercício ou um
 * equivalente no lugar dele, só nesta sessão. O plano do treino não muda.
 */
export function SwapModal({
  planned,
  plannedVariantId,
  current,
  exercises,
  hasLogs,
  onPick,
  onClose,
}: Props) {
  const forms: Option[] = variantsOf(planned).map((variant) => ({
    exercise: planned,
    variantId: variant.id,
  }))

  // Um equivalente com formas vira uma opção por forma: "halteres" e "barra"
  // pesam diferente, então escolher só o exercício deixaria a carga no ar.
  const equivalents: Option[] = equivalentsOf(planned, exercises).flatMap((exercise) => {
    const variants = variantsOf(exercise)
    return variants.length === 0
      ? [{ exercise }]
      : variants.map((variant) => ({ exercise, variantId: variant.id }))
  })

  const isPlanned = (option: Option) =>
    option.exercise.id === planned.id && option.variantId === plannedVariantId
  const isCurrent = (option: Option) =>
    option.exercise.id === current.exerciseId && option.variantId === current.variantId
  const swapped = !(current.exerciseId === planned.id && current.variantId === plannedVariantId)

  function pick(option: Option) {
    onPick(isPlanned(option) ? null : { exerciseId: option.exercise.id, variantId: option.variantId })
  }

  const renderOption = (option: Option, label: string) => (
    <button
      key={`${option.exercise.id}|${option.variantId ?? ''}`}
      type="button"
      className="list__item"
      aria-pressed={isCurrent(option)}
      onClick={() => pick(option)}
    >
      <div className="list__main">
        <div className="list__name">{label}</div>
        {option.exercise.muscleGroup && option.exercise.id !== planned.id && (
          <div className="list__meta">{option.exercise.muscleGroup}</div>
        )}
      </div>
      {isCurrent(option) ? (
        <span className="chip chip--accent">agora</span>
      ) : (
        isPlanned(option) && <span className="chip">do treino</span>
      )}
    </button>
  )

  return (
    <Modal
      title="Trocar só hoje"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Fechar
          </button>
          {swapped && (
            <button type="button" className="btn" onClick={() => onPick(null)}>
              Voltar ao planejado
            </button>
          )}
        </>
      }
    >
      <div className="stack">
        <p className="hint" style={{ margin: 0 }}>
          Vale só para esta sessão: o treino continua com{' '}
          <strong>{exerciseLabel(planned, plannedVariantId)}</strong>. A troca usa o
          próprio histórico de peso para pré-preencher, mas fica fora da sugestão de
          aumento.
          {hasLogs && ' As séries já registradas continuam como foram feitas.'}
        </p>

        {forms.length > 1 && (
          <>
            <h3 className="section-title" style={{ margin: '4px 0 0' }}>
              Forma de fazer
            </h3>
            <div className="list">
              {forms.map((option) => renderOption(option, exerciseLabel(planned, option.variantId)))}
            </div>
          </>
        )}

        {equivalents.length > 0 && (
          <>
            <h3 className="section-title" style={{ margin: '4px 0 0' }}>
              Exercício equivalente
            </h3>
            <div className="list">
              {/* Com o planejado na lista, voltar não exige procurar o botão. */}
              {forms.length <= 1 &&
                renderOption(
                  { exercise: planned, variantId: plannedVariantId },
                  exerciseLabel(planned, plannedVariantId),
                )}
              {equivalents.map((option) =>
                renderOption(option, exerciseLabel(option.exercise, option.variantId)),
              )}
            </div>
          </>
        )}

        {forms.length <= 1 && equivalents.length === 0 && (
          <p className="hint" style={{ margin: 0 }}>
            Este exercício não tem outras formas de fazer nem equivalentes. Cadastre
            em <strong>Exercícios → Editar</strong>.
          </p>
        )}
      </div>
    </Modal>
  )
}
