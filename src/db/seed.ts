import {
  db,
  defaultProgramName,
  type CardioField,
  type Exercise,
  type ExerciseKind,
} from './db'
import { newId } from '../lib/id'

type SeedExercise = [name: string, kind: ExerciseKind, muscleGroup: string]

const SEED: SeedExercise[] = [
  ['Supino reto', 'reps', 'Peito'],
  ['Supino inclinado com halteres', 'reps', 'Peito'],
  ['Crucifixo na máquina', 'reps', 'Peito'],
  ['Puxada frontal', 'reps', 'Costas'],
  ['Remada curvada', 'reps', 'Costas'],
  ['Remada baixa', 'reps', 'Costas'],
  ['Desenvolvimento com halteres', 'reps', 'Ombros'],
  ['Elevação lateral', 'reps', 'Ombros'],
  ['Rosca direta', 'reps', 'Bíceps'],
  ['Rosca martelo', 'reps', 'Bíceps'],
  ['Tríceps na polia', 'reps', 'Tríceps'],
  ['Tríceps testa', 'reps', 'Tríceps'],
  ['Agachamento livre', 'reps', 'Pernas'],
  ['Leg press', 'reps', 'Pernas'],
  ['Cadeira extensora', 'reps', 'Pernas'],
  ['Mesa flexora', 'reps', 'Pernas'],
  ['Cadeira abdutora', 'reps', 'Pernas'],
  ['Cadeira adutora', 'reps', 'Pernas'],
  ['Panturrilha em pé', 'reps', 'Pernas'],
  ['Abdominal supra', 'reps', 'Core'],
  ['Prancha', 'time', 'Core'],
  ['Esteira', 'cardio', 'Cardio'],
  ['Caminhada', 'cardio', 'Cardio'],
  ['Corrida', 'cardio', 'Cardio'],
  ['Bicicleta ergométrica', 'cardio', 'Cardio'],
  ['Elíptico', 'cardio', 'Cardio'],
  ['Escada', 'cardio', 'Cardio'],
  ['Remo ergômetro', 'cardio', 'Cardio'],
]

/** Onde o incremento não é os 2,5 kg padrão. */
const WEIGHT_STEP_BY_NAME: Record<string, number> = {
  'Elevação lateral': 1,
  'Rosca martelo': 1,
  'Leg press': 5,
  'Agachamento livre': 5,
}

/** Métricas de cada aeróbico do seed — a esteira não tem resistência etc. */
const CARDIO_FIELDS_BY_NAME: Record<string, CardioField[]> = {
  Esteira: ['seconds', 'speed', 'incline'],
  Caminhada: ['seconds', 'distance', 'speed'],
  Corrida: ['seconds', 'distance', 'speed', 'heartRate'],
  'Bicicleta ergométrica': ['seconds', 'distance', 'resistance'],
  Elíptico: ['seconds', 'distance', 'resistance'],
  Escada: ['seconds', 'resistance', 'heartRate'],
  'Remo ergômetro': ['seconds', 'distance', 'resistance'],
}

/**
 * Garante que sempre exista um programa ativo para os treinos morarem. A
 * migração da v3 cobre quem já usava o app, mas o Dexie só roda `.upgrade()`
 * ao subir de versão — numa instalação nova ela nunca acontece, e sem isto a
 * aba Treinos abriria sem lugar onde criar treino.
 */
export async function ensureProgram(): Promise<void> {
  if ((await db.programs.count()) > 0) return

  await db.programs.add({
    id: newId(),
    name: defaultProgramName(),
    order: 0,
    archived: 0,
    createdAt: Date.now(),
  })
}

/**
 * Popula o catálogo na primeira execução. Se o usuário apagar tudo, o seed
 * roda de novo — o que é o comportamento desejado para um app sem cadastro.
 */
export async function seedIfEmpty(): Promise<void> {
  // Fora do early-return abaixo de propósito: o catálogo pode já existir e o
  // programa não, por exemplo depois de restaurar um backup antigo.
  await ensureProgram()

  const count = await db.exercises.count()
  if (count > 0) return

  const now = Date.now()
  const exercises: Exercise[] = SEED.map(([name, kind, muscleGroup], i) => ({
    id: newId(),
    name,
    kind,
    muscleGroup,
    cardioFields: kind === 'cardio' ? CARDIO_FIELDS_BY_NAME[name] : undefined,
    weightStep: kind === 'cardio' ? undefined : WEIGHT_STEP_BY_NAME[name],
    archived: 0,
    createdAt: now + i,
  }))

  await db.exercises.bulkAdd(exercises)
}
