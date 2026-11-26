import type { Character } from '../characters'
import { lbToKg, toLevels, type Sheet } from './sheet'

/**
 * GTA: San Andreas — do levantamento "Multiverse Gym Benchmark", v1.3
 * (nov/2026), seção 8 (Carl "CJ" Johnson). As academias têm quatro estações:
 * supino, halteres, esteira e bicicleta. Só as duas de carga entram aqui.
 *
 * O jogo mostra libras: elas ficam como valor primário nas listas abaixo, e a
 * conversão para kg é a matemática (1 lb = 0,45359237 kg), não os
 * arredondamentos de guias secundários.
 *
 * As dez cargas de cada estação são os níveis: a mais leve é o Nível 1, a
 * mais pesada o Nível 10, como no GTA VI.
 *
 * Fora da Arena: esteira e bicicleta têm 10 níveis cada, mas sem unidade
 * física (km/h, watts) para comparar com o seu treino.
 */

/** Barbell Bench Press (Medium Grip): 40 a 320 lb. */
const SUPINO_LB = [40, 60, 80, 100, 120, 160, 200, 240, 280, 320]

/**
 * Dumbbell Bicep Curl: 20 a 110 lb, de 10 em 10. O valor é por halter — a
 * fonte não esclarece, e a convenção do app é que rosca com halteres se anota
 * por halter, diferente da barra.
 */
const ROSCA_LB = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110]

const CJ: Sheet = {
  supino: {
    game: 'Barbell Bench Press (Medium Grip)',
    kg: SUPINO_LB.map(lbToKg),
    status: 'confirmado',
  },
  'rosca-halteres': {
    game: 'Dumbbell Bicep Curl',
    kg: ROSCA_LB.map(lbToKg),
    status: 'associacao-provavel',
    note: 'Por halter, por decisão do usuário; a fonte não confirma a convenção.',
  },
}

export const GTA_SA_CHARACTERS: Character[] = [
  {
    id: 'gtasa-cj',
    name: 'Carl "CJ" Johnson',
    game: 'GTA: San Andreas',
    feat: 'Treina nas academias de Los Santos, San Fierro e Las Venturas.',
    provisional: true,
    levels: toLevels(CJ),
  },
]
