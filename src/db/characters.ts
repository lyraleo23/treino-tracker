/**
 * Catálogo da Arena: as provas e os personagens que disputam cada uma.
 *
 * Fica no código, não no banco, como o seed da dieta: os números vêm junto com
 * o app e chegam a todo aparelho a cada versão. Só a foto do personagem é dado
 * do aparelho (tabela `characterPhotos`), porque é escolhida no celular.
 */

import { GTA6_CHARACTERS } from './catalog/gta6'

/** Unidade em que a prova é medida — carga ou tempo segurado. */
export type ProvaUnit = 'kg' | 's'

/**
 * Movimentos padronizados. O exercício é por máquina ("Leg press da academia")
 * e tem id aleatório, então o personagem não tem como apontar para ele: os dois
 * se encontram na prova. O exercício escolhe a sua no formulário.
 *
 * O id é o que fica gravado no exercício e no catálogo — renomear o `name` é
 * livre, trocar o `id` desliga tudo o que apontava para ele.
 */
export const PROVAS = [
  { id: 'supino', name: 'Supino', unit: 'kg', inPhrase: 'no supino' },
  { id: 'agachamento', name: 'Agachamento', unit: 'kg', inPhrase: 'no agachamento' },
  { id: 'terra', name: 'Levantamento terra', unit: 'kg', inPhrase: 'no levantamento terra' },
  { id: 'leg-press', name: 'Leg press', unit: 'kg', inPhrase: 'no leg press' },
  { id: 'desenvolvimento', name: 'Desenvolvimento', unit: 'kg', inPhrase: 'no desenvolvimento' },
  // Carga de UM halter, como se anota no app: comparar o par com a barra de
  // alguém seria injusto para os dois lados.
  {
    id: 'desenvolvimento-halteres',
    name: 'Desenvolvimento com halteres (por mão)',
    unit: 'kg',
    inPhrase: 'no desenvolvimento com halteres',
  },
  { id: 'puxada', name: 'Puxada', unit: 'kg', inPhrase: 'na puxada' },
  { id: 'remada', name: 'Remada', unit: 'kg', inPhrase: 'na remada' },
  { id: 'rosca', name: 'Rosca', unit: 'kg', inPhrase: 'na rosca' },
  { id: 'triceps', name: 'Tríceps', unit: 'kg', inPhrase: 'no tríceps' },
  { id: 'extensora', name: 'Cadeira extensora', unit: 'kg', inPhrase: 'na cadeira extensora' },
  { id: 'flexora', name: 'Mesa flexora', unit: 'kg', inPhrase: 'na mesa flexora' },
  { id: 'panturrilha', name: 'Panturrilha', unit: 'kg', inPhrase: 'na panturrilha' },
  { id: 'kettlebell', name: 'Kettlebell swing', unit: 'kg', inPhrase: 'no kettlebell swing' },
  { id: 'prancha', name: 'Prancha', unit: 's', inPhrase: 'na prancha' },
] as const satisfies readonly {
  id: string
  name: string
  unit: ProvaUnit
  /** "no supino", "na prancha" — o artigo muda com a prova. */
  inPhrase: string
}[]

export type ProvaId = (typeof PROVAS)[number]['id']
export type Prova = (typeof PROVAS)[number]

export function getProva(id: string | undefined): Prova | undefined {
  return PROVAS.find((prova) => prova.id === id)
}

/**
 * Exercícios do catálogo inicial que já nascem ligados a uma prova. Só os
 * casos sem dúvida. Com halteres a carga costuma ser anotada por mão: o
 * desenvolvimento tem prova própria por mão; supino inclinado e rosca martelo
 * não têm, e ficam para a pessoa ligar se quiser.
 */
export const PROVA_BY_SEED_NAME: Record<string, ProvaId> = {
  'Supino reto': 'supino',
  'Agachamento livre': 'agachamento',
  'Leg press': 'leg-press',
  'Puxada frontal': 'puxada',
  'Remada curvada': 'remada',
  'Remada baixa': 'remada',
  'Rosca direta': 'rosca',
  'Tríceps na polia': 'triceps',
  'Cadeira extensora': 'extensora',
  'Mesa flexora': 'flexora',
  'Panturrilha em pé': 'panturrilha',
  'Desenvolvimento com halteres': 'desenvolvimento-halteres',
  Prancha: 'prancha',
}

type Loads = Partial<Record<ProvaId, number>>

/** Um nível do personagem ("Força 3") e as cargas dele nesse nível. */
export interface CharacterLevel {
  level: number
  /** Mesma unidade de `Character.loads`. Prova ausente: não visto neste nível. */
  loads: Loads
}

export interface Character {
  /**
   * Slug estável ("kratos"). A foto escolhida no celular é guardada por ele:
   * trocar o id de um personagem perde a foto.
   */
  id: string
  name: string
  game: string
  /** A frase ou o feito que justifica os números — aparece no cartão. */
  feat?: string
  /**
   * Arquivo em `public/personagens/` (só o nome: "kratos.webp"). Para o dia em
   * que as imagens vierem com o app; a foto escolhida no celular tem
   * prioridade sobre ela. O repositório é público: só entra aqui imagem que
   * pode ser publicada.
   */
  image?: string
  /** Como o jogo chama os níveis: "Força" no GTA VI. Ausente, "Nível". */
  levelLabel?: string
  /**
   * Os níveis, cada um com as suas cargas. Nome, foto e frase são do
   * personagem e valem para todos — só os números mudam de nível para nível.
   * Basta um nível com carga para os níveis passarem a valer no lugar de
   * `loads`.
   */
  levels?: CharacterLevel[]
  /**
   * Cargas sem nível: o personagem inteiro num degrau só. Carga máxima numa
   * repetição, em kg — ou segundos, nas provas de tempo. Ausente é "não
   * disputa esta prova": nem todo personagem tem todas.
   */
  loads?: Loads
  /** Números ainda em revisão: a página do personagem avisa. */
  provisional?: boolean
}

/**
 * Um degrau da Arena: um nível de um personagem, ou o personagem inteiro
 * quando ele não tem níveis. É com degraus que a escada e a média trabalham —
 * Jason na Força 2 e Jason na Força 4 disputam como rivais diferentes.
 */
export interface Rung {
  /** "gta6-jason#3" ou só "gta6-jason": chave estável para listas e vitórias. */
  key: string
  character: Character
  level?: number
  loads: Loads
}

export function rungsOf(character: Character): Rung[] {
  const levels = (character.levels ?? [])
    .filter((level) => Object.keys(level.loads).length > 0)
    .sort((a, b) => a.level - b.level)

  if (levels.length > 0) {
    return levels.map((level) => ({
      key: `${character.id}#${level.level}`,
      character,
      level: level.level,
      loads: level.loads,
    }))
  }

  const loads = character.loads ?? {}
  return Object.keys(loads).length > 0 ? [{ key: character.id, character, loads }] : []
}

/** "Força 3"; `undefined` para o personagem sem níveis. */
export function levelName(rung: Pick<Rung, 'character' | 'level'>): string | undefined {
  if (rung.level === undefined) return undefined
  // Espaço que não quebra: "Força" numa linha e "4" na outra parece outra coisa.
  return `${rung.character.levelLabel ?? 'Nível'}\u00a0${rung.level}`
}

/** "Jason Duval · Força 3" ou só "Jason Duval". */
export function rungName(rung: Rung): string {
  const level = levelName(rung)
  return level ? `${rung.character.name} · ${level}` : rung.character.name
}

/**
 * Os personagens, um arquivo por jogo em `catalog/`. Cada arquivo guarda os
 * números como vieram da fonte (libras, observações) e converte aqui na hora
 * de montar o personagem.
 */
export const CHARACTERS: Character[] = [...GTA6_CHARACTERS]

/** Todos os degraus da Arena, de todos os personagens. */
export const RUNGS: Rung[] = CHARACTERS.flatMap(rungsOf)

export function getCharacter(id: string | undefined): Character | undefined {
  return CHARACTERS.find((character) => character.id === id)
}
