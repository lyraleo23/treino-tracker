import { useRef, useState } from 'react'
import type { Exercise, ExerciseKind } from '../db/db'
import { createExercise, setExercisePhoto, updateExercise } from '../db/actions'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { isSafeUrl, resizeImage } from '../lib/image'
import { Modal } from './Modal'

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
  const [photo, setPhoto] = useState<Blob | undefined>(exercise?.photo)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const photoUrl = useObjectUrl(photo)

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

    if (exercise) {
      await updateExercise(exercise.id, {
        name: name.trim(),
        kind,
        muscleGroup: muscleGroup.trim() || undefined,
        notes: notes.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
      })
      // A foto tem carimbo próprio, então vai por uma ação separada.
      if (photo !== exercise.photo) await setExercisePhoto(exercise.id, photo)
      onSaved?.(exercise.id)
    } else {
      const id = await createExercise({ name, kind, muscleGroup, notes, videoUrl, photo })
      onSaved?.(id)
    }
    onClose()
  }

  return (
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
          </div>
          <span className="hint">
            {kind === 'reps'
              ? 'Registra peso e número de repetições.'
              : 'Registra a duração executada (e peso, se houver).'}
          </span>
        </div>

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
  )
}
