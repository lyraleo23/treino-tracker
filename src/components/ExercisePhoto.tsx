import { useState } from 'react'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { Modal } from './Modal'

interface Props {
  photo?: Blob
  name: string
  /** `thumb` na lista e na sessão; `hero` no topo da tela do exercício. */
  variant?: 'thumb' | 'hero'
}

/** Foto do exercício que abre em tamanho grande ao toque. */
export function ExercisePhoto({ photo, name, variant = 'thumb' }: Props) {
  const url = useObjectUrl(photo)
  const [zoom, setZoom] = useState(false)

  if (!url) return null

  return (
    <>
      <img
        className={variant === 'hero' ? 'photo-hero' : 'thumb'}
        src={url}
        alt={`Foto de ${name}`}
        onClick={(event) => {
          event.stopPropagation()
          setZoom(true)
        }}
      />
      {zoom && (
        <Modal title={name} onClose={() => setZoom(false)}>
          <img className="photo-full" src={url} alt={`Foto de ${name}`} />
        </Modal>
      )}
    </>
  )
}
