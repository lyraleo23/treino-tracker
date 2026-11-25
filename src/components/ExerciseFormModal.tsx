import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  DEFAULT_CARDIO_FIELDS,
  DEFAULT_WEIGHT_STEP,
  type CardioField,
  type Exercise,
  type ExerciseKind,
  type ExerciseVariant,
} from '../db/db'
import {
  createExercise,
  setExerciseEquivalents,
  setExercisePhoto,
  updateExercise,
} from '../db/actions'
import { isProvaVisible, PROVAS, type ProvaId } from '../db/characters'
import { getArenaSettings } from '../db/queries'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { CARDIO_LABELS, formatNumber, normalizeSearchText } from '../lib/format'
import { newId } from '../lib/id'
import { defaultVariantId, logVariantId } from '../lib/variants'
import { isSafeUrl, resizeImage } from '../lib/image'
import { Modal } from './Modal'
import { CloseIcon } from './icons'
import { ExercisePicker } from './ExercisePicker'

const WEIGHT_STEPS = [1, 2.5, 5, 10]

/** Atalhos para as formas mais comuns; o campo livre cobre o resto. */
const COMMON_VARIANTS = ['Barra', 'Halteres', 'Smith', 'Máquina', 'Polia', 'Elástico']

const CARDIO_ORDER: CardioField[] = [
  'seconds',
  'distance',
  'speed',
  'incline',
  'resistance',
  'heartRate',
  'calories',
]

const KIND_HINTS: Record<ExerciseKind, string> = {
  reps: 'Registra peso e número de repetições.',
  time: 'Registra a duração executada (e peso, se houver).',
  cardio: 'Registra tempo, velocidade, inclinação e o que mais você marcar abaixo.',
}

interface Props {
  /** Exercício em edição; ausente cria um novo. */
  exercise?: Exercise
  /** Nome sugerido ao criar (vem da busca sem resultados). */
  initialName?: string
  onClose: () => void
  onSaved?: (id: string) => void
}

export function ExerciseFormModal({ exercise, initialName, onClose, onSaved }: Props) {
  const [name, setName] = useState(exercise?.name ?? initialName ?? '')
  const [kind, setKind] = useState<ExerciseKind>(exercise?.kind ?? 'reps')
  const [muscleGroup, setMuscleGroup] = useState(exercise?.muscleGroup ?? '')
  const [notes, setNotes] = useState(exercise?.notes ?? '')
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl ?? '')
  const [fields, setFields] = useState<CardioField[]>(
    exercise?.cardioFields ?? DEFAULT_CARDIO_FIELDS,
  )
  const [weightStep, setWeightStep] = useState(exercise?.weightStep ?? DEFAULT_WEIGHT_STEP)
  const [prova, setProva] = useState<ProvaId | undefined>(exercise?.prova)
  const [photo, setPhoto] = useState<Blob | undefined>(exercise?.photo)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const photoUrl = useObjectUrl(photo)

  const [variants, setVariants] = useState<ExerciseVariant[]>(exercise?.variants ?? [])
  const [defaultId, setDefaultId] = useState<string | undefined>(defaultVariantId(exercise))
  const [newVariant, setNewVariant] = useState('')
  /** `null` enquanto ninguém mexeu: vale o que está gravado. */
  const [equivalents, setEquivalents] = useState<string[] | null>(null)
  const [pickingEquivalent, setPickingEquivalent] = useState(false)

  const catalog = useLiveQuery(() => db.exercises.toArray(), [])

  /**
   * Sessões de cada forma no histórico, pela regra de quem é dono de qual
   * série (`logVariantId`). A chave vazia é o exercício sem forma.
   */
  const sessionsByVariant = useLiveQuery(async () => {
    const counts = new Map<string, number>()
    if (!exercise) return counts
    const logs = await db.setLogs.where('exerciseId').equals(exercise.id).toArray()
    const sessions = new Map<string, Set<string>>()
    for (const log of logs) {
      const key = logVariantId(log, exercise) ?? ''
      const set = sessions.get(key) ?? new Set<string>()
      set.add(log.sessionId)
      sessions.set(key, set)
    }
    for (const [key, set] of sessions) counts.set(key, set.size)
    return counts
  }, [exercise])

  // As duas direções: quem este exercício cita e quem cita este exercício.
  const savedEquivalents = exercise
    ? [
        ...new Set([
          ...(exercise.equivalents ?? []),
          ...(catalog ?? [])
            .filter((other) => other.equivalents?.includes(exercise.id))
            .map((other) => other.id),
        ]),
      ]
    : []
  const equivalentIds = equivalents ?? savedEquivalents
  const equivalentList = equivalentIds
    .map((id) => catalog?.find((other) => other.id === id))
    .filter((other): other is Exercise => !!other)

  const cleanVariants = variants
    .map((variant) => ({ ...variant, name: variant.name.trim() }))
    .filter((variant) => variant.name.length > 0)
  const defaultToSave = cleanVariants.some((variant) => variant.id === defaultId)
    ? defaultId
    : cleanVariants[0]?.id
  const removedWithHistory = (exercise?.variants ?? [])
    .filter((variant) => !cleanVariants.some((kept) => kept.id === variant.id))
    .filter((variant) => (sessionsByVariant?.get(variant.id) ?? 0) > 0)
  const legacySessions = sessionsByVariant?.get('') ?? 0

  function addVariant(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const exists = variants.some(
      (variant) => normalizeSearchText(variant.name) === normalizeSearchText(trimmed),
    )
    if (!exists) {
      const variant = { id: newId(), name: trimmed }
      setVariants((current) => [...current, variant])
      if (variants.length === 0) setDefaultId(variant.id)
    }
    setNewVariant('')
  }

  function removeVariant(id: string) {
    const rest = variants.filter((variant) => variant.id !== id)
    setVariants(rest)
    if (defaultId === id) setDefaultId(rest[0]?.id)
  }

  // Repetições disputam provas de carga; tempo, as de segundos. Trocar a
  // medição esconde a prova que não combina, e ela não é gravada.
  const provaOptions = PROVAS.filter((option) => option.unit === (kind === 'time' ? 's' : 'kg'))
  const provaToSave =
    kind !== 'cardio' && provaOptions.some((option) => option.id === prova) ? prova : undefined

  // Ajustes → Arena pode esconder as provas sem personagem. A prova que o
  // exercício já tem aparece mesmo assim: escondida, o chip sumiria e salvar o
  // formulário por outro motivo apagaria a ligação.
  const arenaSettings = useLiveQuery(getArenaSettings, [])
  const showUndisputed = arenaSettings?.showUndisputedProvas ?? false
  const visibleProvaOptions = provaOptions.filter(
    (option) => isProvaVisible(option.id, showUndisputed) || option.id === exercise?.prova,
  )
  const hiddenProvas = provaOptions.length - visibleProvaOptions.length

  const urlOk = isSafeUrl(videoUrl)
  const canSave = name.trim().length > 0 && urlOk

  async function handlePick(file: File) {
    try {
      setPhoto(await resizeImage(file))
      setPhotoError(null)
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : 'Falha ao ler a imagem.')
    }
  }

  async function handleSave() {
    if (!canSave) return

    // Guardar as métricas num exercício que não é aeróbico só deixa lixo, e o
    // mesmo vale para o incremento de carga num aeróbico.
    const cardioFields = kind === 'cardio' ? fields : undefined
    const step = kind === 'cardio' ? undefined : weightStep
    const variantsToSave = cleanVariants.length > 0 ? cleanVariants : undefined
    const defaultVariant = variantsToSave ? defaultToSave : undefined

    if (exercise) {
      await updateExercise(exercise.id, {
        name: name.trim(),
        kind,
        muscleGroup: muscleGroup.trim() || undefined,
        notes: notes.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        cardioFields,
        weightStep: step,
        prova: provaToSave,
        variants: variantsToSave,
        defaultVariantId: defaultVariant,
      })
      // A foto tem carimbo próprio, então vai por uma ação separada.
      if (photo !== exercise.photo) await setExercisePhoto(exercise.id, photo)
      // Os equivalentes gravam dos dois lados; só vale o trabalho se mudaram.
      if (equivalents !== null) await setExerciseEquivalents(exercise.id, equivalents)
      onSaved?.(exercise.id)
    } else {
      const id = await createExercise({
        name,
        kind,
        muscleGroup,
        notes,
        videoUrl,
        photo,
        cardioFields,
        weightStep: step,
        prova: provaToSave,
        variants: variantsToSave,
        defaultVariantId: defaultVariant,
      })
      if (equivalents?.length) await setExerciseEquivalents(id, equivalents)
      onSaved?.(id)
    }
    onClose()
  }

  return (
    <>
      <Modal
        title={exercise ? 'Editar exercício' : 'Novo exercício'}
        onClose={onClose}
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canSave}
              onClick={() => void handleSave()}
            >
              Salvar
            </button>
          </>
        }
      >
        <div className="stack">
          <div className="field">
            <label className="field__label" htmlFor="exercise-name">
              Nome
            </label>
            <input
              id="exercise-name"
              className="input"
              value={name}
              autoFocus={!exercise}
              placeholder="Supino reto"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="field">
            <span className="field__label">Medição</span>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={kind === 'reps'}
                onClick={() => setKind('reps')}
              >
                Repetições
              </button>
              <button
                type="button"
                aria-pressed={kind === 'time'}
                onClick={() => setKind('time')}
              >
                Tempo
              </button>
              <button
                type="button"
                aria-pressed={kind === 'cardio'}
                onClick={() => setKind('cardio')}
              >
                Aeróbico
              </button>
            </div>
            <span className="hint">{KIND_HINTS[kind]}</span>
          </div>

          <div className="field">
            <span className="field__label">Formas de fazer</span>
            {variants.length > 0 && (
              <div className="stack" style={{ gap: 6 }}>
                {variants.map((variant) => (
                  <div key={variant.id} className="variant-row">
                    <input
                      className="input"
                      value={variant.name}
                      aria-label="Nome da forma de fazer"
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((other) =>
                            other.id === variant.id
                              ? { ...other, name: event.target.value }
                              : other,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className={
                        variant.id === defaultToSave ? 'chip-option is-active' : 'chip-option'
                      }
                      aria-pressed={variant.id === defaultToSave}
                      onClick={() => setDefaultId(variant.id)}
                    >
                      {variant.id === defaultToSave ? 'padrão' : 'tornar padrão'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--icon btn--ghost"
                      aria-label={`Remover ${variant.name || 'forma'}`}
                      onClick={() => removeVariant(variant.id)}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="row" style={{ gap: 6 }}>
              <input
                className="input"
                value={newVariant}
                placeholder={variants.length === 0 ? 'Barra, halteres...' : 'Outra forma'}
                aria-label="Nova forma de fazer"
                onChange={(event) => setNewVariant(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addVariant(newVariant)
                  }
                }}
              />
              <button
                type="button"
                className="btn btn--sm"
                disabled={!newVariant.trim()}
                onClick={() => addVariant(newVariant)}
              >
                Adicionar
              </button>
            </div>
            <div className="chip-grid">
              {COMMON_VARIANTS.filter(
                (name) =>
                  !variants.some(
                    (variant) => normalizeSearchText(variant.name) === normalizeSearchText(name),
                  ),
              ).map((name) => (
                <button
                  key={name}
                  type="button"
                  className="chip-option"
                  onClick={() => addVariant(name)}
                >
                  + {name}
                </button>
              ))}
            </div>
            <span className="hint">
              O mesmo movimento com outro equipamento. Cada forma guarda o próprio
              histórico de carga, e cada treino escolhe com qual vai fazer. A padrão vale
              quando o treino não escolhe.
              {legacySessions > 0 &&
                cleanVariants.length > 0 &&
                (exercise?.variants ?? []).length === 0 &&
                (legacySessions === 1
                ? ' A sessão que já existe fica com a forma padrão.'
                : ` As ${legacySessions} sessões que já existem ficam com a forma padrão.`)}
            </span>
            {removedWithHistory.map((variant) => (
              <span key={variant.id} className="hint" style={{ color: 'var(--warn)' }}>
                {`${variant.name} tem ${sessionsByVariant?.get(variant.id)} ${
                  sessionsByVariant?.get(variant.id) === 1 ? 'sessão' : 'sessões'
                } no histórico. Removida, ela deixa de pré-preencher a carga — as séries continuam no gráfico do exercício.`}
              </span>
            ))}
          </div>

          <div className="field">
            <span className="field__label">Exercícios equivalentes</span>
            {equivalentList.length > 0 && (
              <div className="chip-grid">
                {equivalentList.map((other) => (
                  <button
                    key={other.id}
                    type="button"
                    className="chip-option is-active"
                    aria-label={`Tirar ${other.name} dos equivalentes`}
                    onClick={() =>
                      setEquivalents(equivalentIds.filter((id) => id !== other.id))
                    }
                  >
                    {other.name}
                    {other.archived === 1 && ' (arquivado)'} ×
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="btn btn--sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setPickingEquivalent(true)}
            >
              Adicionar equivalente
            </button>
            <span className="hint">
              Podem entrar no lugar deste no dia em que o aparelho estiver ocupado — a
              troca é feita na hora, no treino. A ligação vale nos dois sentidos.
            </span>
          </div>

          {kind !== 'cardio' && (
            <div className="field">
              <span className="field__label">Incremento de carga</span>
              <div className="chip-grid">
                {WEIGHT_STEPS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={option === weightStep ? 'chip-option is-active' : 'chip-option'}
                    aria-pressed={option === weightStep}
                    onClick={() => setWeightStep(option)}
                  >
                    {formatNumber(option)} kg
                  </button>
                ))}
              </div>
              <span className="hint">
                De quanto em quanto a carga sobe neste aparelho. É o que as sugestões de
                ajuste usam para arredondar — halteres pequenos costumam ir de 1 em 1,
                barra de 2,5 em 2,5, leg press de 5 em 5.
              </span>
            </div>
          )}

          {kind !== 'cardio' && (
            <div className="field">
              <span className="field__label">Prova da Arena</span>
              <div className="chip-grid">
                <button
                  type="button"
                  className={provaToSave === undefined ? 'chip-option is-active' : 'chip-option'}
                  aria-pressed={provaToSave === undefined}
                  onClick={() => setProva(undefined)}
                >
                  Nenhuma
                </button>
                {visibleProvaOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={option.id === provaToSave ? 'chip-option is-active' : 'chip-option'}
                    aria-pressed={option.id === provaToSave}
                    onClick={() => setProva(option.id)}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
              <span className="hint">
                Com qual movimento este exercício disputa contra os personagens. Duas
                máquinas podem ter a mesma prova — na média da Arena vale a melhor.
                {hiddenProvas > 0 &&
                  ' Provas que nenhum personagem disputa estão ocultas (Ajustes → Arena).'}
              </span>
            </div>
          )}

          {kind === 'cardio' && (
            <div className="field">
              <span className="field__label">Métricas deste aparelho</span>
              <div className="chip-grid">
                {CARDIO_ORDER.map((option) => {
                  const active = fields.includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      className={active ? 'chip-option is-active' : 'chip-option'}
                      aria-pressed={active}
                      onClick={() =>
                        setFields((current) =>
                          active
                            ? current.filter((f) => f !== option)
                            : // Mantém a ordem canônica, não a de clique.
                              CARDIO_ORDER.filter((f) => f === option || current.includes(f)),
                        )
                      }
                    >
                      {CARDIO_LABELS[option].short}
                    </button>
                  )
                })}
              </div>
              <span className="hint">
                Só as marcadas aparecem na hora de registrar. Esteira costuma usar tempo,
                velocidade e inclinação; bicicleta, tempo, distância e resistência.
              </span>
            </div>
          )}

          <div className="field">
            <label className="field__label" htmlFor="exercise-group">
              Grupo muscular
            </label>
            <input
              id="exercise-group"
              className="input"
              value={muscleGroup}
              placeholder="Peito"
              onChange={(event) => setMuscleGroup(event.target.value)}
            />
          </div>

          <div className="field">
            <span className="field__label">Foto</span>
            <div className="row">
              {photoUrl ? (
                <img className="photo-preview" src={photoUrl} alt={`Foto de ${name}`} />
              ) : (
                <div className="photo-preview photo-preview--empty">sem foto</div>
              )}
              <div className="stack" style={{ flex: 1 }}>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => photoInput.current?.click()}
                >
                  {photo ? 'Trocar foto' : 'Escolher foto'}
                </button>
                {photo && (
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => setPhoto(undefined)}
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void handlePick(file)
              }}
            />
            {photoError && (
              <span className="hint" style={{ color: 'var(--danger)' }}>
                {photoError}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="exercise-video">
              Link do vídeo
            </label>
            <input
              id="exercise-video"
              className="input"
              type="url"
              inputMode="url"
              value={videoUrl}
              placeholder="https://youtube.com/..."
              onChange={(event) => setVideoUrl(event.target.value)}
            />
            {!urlOk && (
              <span className="hint" style={{ color: 'var(--danger)' }}>
                Use um endereço começando com http:// ou https://
              </span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="exercise-notes">
              Observações
            </label>
            <textarea
              id="exercise-notes"
              className="textarea"
              value={notes}
              placeholder="Pegada, ajuste do banco, cadência..."
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      {pickingEquivalent && (
        <ExercisePicker
          title="Equivalente"
          hint={`Qual exercício pode entrar no lugar de ${name.trim() || 'este'}?`}
          kind={kind}
          excludeIds={[...(exercise ? [exercise.id] : []), ...equivalentIds]}
          onClose={() => setPickingEquivalent(false)}
          onPick={(other) => {
            setEquivalents([...equivalentIds, other.id])
            setPickingEquivalent(false)
          }}
        />
      )}
    </>
  )
}
