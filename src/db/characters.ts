/**
 * Catálogo da Arena: as provas e os personagens que disputam cada uma.
 *
 * Fica no código, não no banco, como o seed da dieta: os números vêm junto com
 * o app e chegam a todo aparelho a cada versão. Só a foto do personagem é dado
 * do aparelho (tabela `characterPhotos`), porque é escolhida no celular.
 */

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
  { id: 'puxada', name: 'Puxada', unit: 'kg', inPhrase: 'na puxada' },
  { id: 'remada', name: 'Remada', unit: 'kg', inPhrase: 'na remada' },
  { id: 'rosca', name: 'Rosca', unit: 'kg', inPhrase: 'na rosca' },
  { id: 'triceps', name: 'Tríceps', unit: 'kg', inPhrase: 'no tríceps' },
  { id: 'extensora', name: 'Cadeira extensora', unit: 'kg', inPhrase: 'na cadeira extensora' },
  { id: 'flexora', name: 'Mesa flexora', unit: 'kg', inPhrase: 'na mesa flexora' },
  { id: 'panturrilha', name: 'Panturrilha', unit: 'kg', inPhrase: 'na panturrilha' },
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
 * casos sem dúvida: com halteres a carga costuma ser anotada por mão, e
 * compará-la com a barra de um personagem seria injusto — esses ficam para a
 * pessoa ligar se quiser.
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
  Prancha: 'prancha',
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
  /**
   * Carga máxima numa repetição, em kg — ou segundos, nas provas de tempo.
   * Ausente é "não disputa esta prova": nem todo personagem tem todas.
   */
  loads: Partial<Record<ProvaId, number>>
}

/**
 * Os personagens. Vazio até o elenco chegar; a Arena mostra só as suas marcas
 * enquanto isso.
 */
export const CHARACTERS: Character[] = []

export function getCharacter(id: string | undefined): Character | undefined {
  return CHARACTERS.find((character) => character.id === id)
}
