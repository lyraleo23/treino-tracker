import { useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getArena } from '../db/arena'
import { getCharacter, levelName, PROVAS, rungsOf } from '../db/characters'
import { setCharacterPhoto } from '../db/actions'
import {
  compareWith,
  formatMark,
  formatRatio,
  MIN_SHARED_PROVAS,
  RATIO_CAP,
  STRENGTH_WINDOW_DAYS,
  summarize,
} from '../lib/strength'
import { resizeImage } from '../lib/image'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { CharacterAvatar } from '../components/CharacterAvatar'

interface FromState {
  from?: string
  label?: string
  /** Nível para abrir já selecionado — o do rival que trouxe até aqui. */
  level?: number
}

/**
 * Um personagem: a foto, o feito e você contra ele, prova a prova — nível a
 * nível, quando ele tem níveis.
 */
export function CharacterPage() {
  const { characterId } = useParams<{ characterId: string }>()
  const { state } = useLocation()
  const origin = (state ?? {}) as FromState
  const backTo = origin.from ?? '/arena'
  const backLabel = origin.label ?? 'Arena'

  const photoInput = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  /** `undefined` deixa a tela escolher: o próximo nível a vencer. */
  const [pickedLevel, setPickedLevel] = useState<number | undefined>(origin.level)

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
  const summary = summarize(
    character,
    rungsOf(character).map((rung) => compareWith(rung, yours)),
  )
  const leveled = summary.results.some((item) => item.rung.level !== undefined)
  const manyLevels = summary.results.length > 5
  const result =
    summary.results.find((item) => item.rung.level === pickedLevel) ??
    summary.next ??
    summary.reached ??
    summary.results[0]
  const loads = result?.rung.loads ?? {}
  const provas = PROVAS.filter((prova) => loads[prova.id] !== undefined)
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
          {character.provisional && <span className="chip chip--warn">Pesos em revisão</span>}

          {summary.reached && leveled && (
            <span className="chip chip--accent">
              ✓ Alcançado: {levelName(summary.reached.rung)}
            </span>
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

        {leveled && (
          <>
            <h2 className="section-title">{character.levelLabel ?? 'Nível'}</h2>
            {/* Até cinco níveis cabem numa barra; o CJ tem dez, e com os ✓ dos
                vencidos a barra estouraria a 320px — vira chips que quebram linha. */}
            <div className={manyLevels ? 'chip-grid chip-grid--wide' : 'segmented'}>
              {summary.results.map((item) => {
                const reached = item.ratio !== undefined && item.ratio >= 1
                return (
                  <button
                    key={item.rung.key}
                    type="button"
                    className={
                      manyLevels ? (item === result ? 'chip-option is-active' : 'chip-option') : undefined
                    }
                    aria-pressed={item === result}
                    aria-label={`${levelName(item.rung)}${reached ? ', alcançado' : ''}`}
                    onClick={() => setPickedLevel(item.rung.level)}
                  >
                    {item.rung.level}
                    {reached && ' ✓'}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <h2 className="section-title">
          Prova a prova{leveled && result ? ` · ${levelName(result.rung)}` : ''}
        </h2>
        {result && arena && (
          <p className="hint" style={{ marginTop: -4 }}>
            {result.ratio !== undefined
              ? `${result.ratio >= 1 ? '✓ Alcançado. ' : ''}Em média você aguenta ${formatRatio(result.ratio)} do que ${character.name.split(' ')[0]} aguenta${leveled ? ' neste nível' : ''}.`
              : `Faltam provas em comum: ${result.shared.length} de ${needed}.`}
          </p>
        )}
        <div className="card card--tight">
          <table className="table table--marks">
            <thead>
              <tr>
                <th>Prova</th>
                {/* Primeiro nome: "Personagem" alargava a coluna e empurrava o % para
                    fora da tela num iPhone. */}
                <th>{character.name.split(' ')[0]}</th>
                <th>Você</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {provas.map((prova) => {
                const theirs = loads[prova.id]!
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
          {character.provisional &&
            ' Os números deste personagem foram vistos no jogo e ainda estão sendo conferidos.'}
        </p>
      </div>
    </>
  )
}
