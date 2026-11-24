import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Character } from '../db/characters'
import { useObjectUrl } from '../hooks/useObjectUrl'

interface Props {
  character: Character
  /** `sm` no treino, `md` nas listas, `lg` no cartão de destaque. */
  size?: 'sm' | 'md' | 'lg'
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
}

/**
 * Imagem do personagem, na ordem: a foto escolhida no celular, a imagem que
 * vem com o app (`public/personagens/`) e, sem nenhuma das duas, as iniciais
 * sobre um degradê do tema — tudo funciona antes de existir foto.
 */
export function CharacterAvatar({ character, size = 'md' }: Props) {
  // `null` é "não tem foto"; `undefined` ainda está lendo o banco. A diferença
  // evita mostrar a imagem do app por um instante antes da foto do celular.
  const saved = useLiveQuery(
    async () => (await db.characterPhotos.get(character.id)) ?? null,
    [character.id],
  )
  const photoUrl = useObjectUrl(saved?.photo)
  const [bundledFailed, setBundledFailed] = useState(false)

  const bundledUrl =
    character.image && !bundledFailed
      ? `${import.meta.env.BASE_URL}personagens/${character.image}`
      : undefined
  // Também espera a URL da foto, que só nasce no efeito depois do render.
  const loading = saved === undefined || (saved !== null && !photoUrl)
  const src = loading ? undefined : (photoUrl ?? bundledUrl)

  if (src) {
    return (
      <img
        className={`avatar avatar--${size}`}
        src={src}
        alt=""
        onError={() => {
          if (src === bundledUrl) setBundledFailed(true)
        }}
      />
    )
  }

  return (
    <span className={`avatar avatar--${size} avatar--initials`} aria-hidden="true">
      {loading ? '' : initials(character.name)}
    </span>
  )
}
