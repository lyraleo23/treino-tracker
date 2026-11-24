import { useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getArena } from '../db/arena'
import { getCharacter, PROVAS } from '../db/characters'
import { setCharacterPhoto } from '../db/actions'
import {
  compareWith,
  formatMark,
  formatRatio,
  MIN_SHARED_PROVAS,
  RATIO_CAP,
  STRENGTH_WINDOW_DAYS,
} from '../lib/strength'
import { resizeImage } from '../lib/image'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { CharacterAvatar } from '../components/CharacterAvatar'

interface FromState {
  from?: string
  label?: string
}

/** Um personagem: a foto, o feito e você contra ele, prova a prova. */
export function CharacterPage() {
  const { characterId } = useParams<{ characterId: string }>()
  const { state } = useLocation()
  const origin = (state ?? {}) as FromState
  const backTo = origin.from ?? '/arena'
  const backLabel = origin.label ?? 'Arena'

  const photoInput = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const character = getCharacter(characterId)
  const arena = useLiveQuery(getArena, [])
  const hasPhoto = useLiveQuery(
    async () => (characterId ? !!(await db.characterPhotos.get(characterId)) : false),
    [characterId],
  )

  if (!character) {
    return (
      <>
        <PageHeader title="Personagem" back backTo={backTo} backLabel={backLabel} />
        <div className="page">
          <EmptyState icon="🤔" title="Personagem não encontrado" />
        </div>
      </>
    )
  }

  async function handlePick(file: File) {
    try {
      await setCharacterPhoto(character!.id, await resizeImage(file))
      setPhotoError(null)
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : 'Falha ao ler a imagem.')
    }
  }

  const yours = Object.fromEntries(
    (arena?.marks ?? [])
      .filter((item) => item.mark)
      .map((item) => [item.prova.id, item.mark!.value]),
  )
  const result = compareWith(character, yours)
  const provas = PROVAS.filter((prova) => character.loads[prova.id] !== undefined)
  const needed = Math.min(MIN_SHARED_PROVAS, provas.length)

  return (
    <>
      <PageHeader
        title={character.name}
        subtitle={character.game}
        back
        backTo={backTo}
        backLabel={backLabel}
      />

      <div className="page">
        <section className="card arena-hero">
          <CharacterAvatar character={character} size="lg" />
          {character.feat && <p className="arena-hero__feat">“{character.feat}”</p>}

          {result.ratio !== undefined ? (
            <span className={result.ratio >= 1 ? 'chip chip--accent' : 'chip'}>
              {result.ratio >= 1 ? '✓ Alcançado · ' : ''}
              você aguenta {formatRatio(result.ratio)} em média
            </span>
          ) : (
            arena && (
              <span className="chip">
                Faltam provas em comum: {result.shared.length} de {needed}
              </span>
            )
          )}

          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => photoInput.current?.click()}
            >
              {hasPhoto ? 'Trocar foto' : 'Escolher foto'}
            </button>
            {hasPhoto && (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => void setCharacterPhoto(character.id, undefined)}
              >
                Remover
              </button>
            )}
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
        </section>

        <h2 className="section-title">Prova a prova</h2>
        <div className="card card--tight">
          <table className="table table--marks">
            <thead>
              <tr>
                <th>Prova</th>
                <th>Personagem</th>
                <th>Você</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {provas.map((prova) => {
                const theirs = character.loads[prova.id]!
                const mine = yours[prova.id]
                const ratio = mine !== undefined ? mine / theirs : undefined
                return (
                  <tr key={prova.id}>
                    <td>{prova.name}</td>
                    <td>{formatMark(theirs, prova.unit)}</td>
                    <td>{mine !== undefined ? formatMark(mine, prova.unit) : '—'}</td>
                    <td className={ratio !== undefined && ratio >= 1 ? 'is-beaten' : undefined}>
                      {ratio !== undefined ? formatRatio(ratio) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">
          “—” é prova sem exercício ligado ou sem série nos últimos {STRENGTH_WINDOW_DAYS}{' '}
          dias. Na média, cada prova conta no máximo {formatRatio(RATIO_CAP)}.
        </p>
      </div>
    </>
  )
}
