import type { CharacterLevel, ProvaId } from '../characters'

/**
 * A ficha de cargas de um personagem, como vem dos levantamentos: por prova,
 * as cargas que o jogo oferece no exercício. Comum a todos os jogos do
 * catálogo.
 */

/** O status da informação no levantamento. */
export type Status =
  /** Exercício e carga aparecem claramente na captura ou na fonte. */
  | 'confirmado'
  /** Carga clara, mas a associação com o exercício ou a convenção é provável. */
  | 'associacao-provavel'

export interface Observation {
  /**
   * As cargas do jogo, em kg, da mais leve à mais pesada: a posição é o nível
   * (a 1ª é o nível 1). Com menos cargas que níveis, os níveis de cima ficam
   * sem esta prova.
   */
  kg: number[]
  status: Status
  /** Exercício como o jogo chama, para conferir com o levantamento. */
  game: string
  note?: string
}

export type Sheet = Partial<Record<ProvaId, Observation>>

/** Um nível por posição na lista de cargas: a 1ª carga é o nível 1. */
export function toLevels(sheet: Sheet): CharacterLevel[] {
  const levels: CharacterLevel[] = []
  for (const [prova, observation] of Object.entries(sheet) as [ProvaId, Observation][]) {
    const ordered = [...observation.kg].sort((a, b) => a - b)
    ordered.forEach((kg, index) => {
      levels[index] ??= { level: index + 1, loads: {} }
      levels[index].loads[prova] = kg
    })
  }
  return levels
}

const LB_TO_KG = 0.45359237

/**
 * Libras para kg, em centésimos — a precisão dos levantamentos (40 lb =
 * 18,14 kg). Jogo que mostra libras guarda as libras como valor primário e
 * converte só aqui.
 */
export function lbToKg(lb: number): number {
  return Math.round(lb * LB_TO_KG * 100) / 100
}
