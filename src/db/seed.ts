import { db, type Exercise, type ExerciseKind } from './db'
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
  ['Panturrilha em pé', 'reps', 'Pernas'],
  ['Abdominal supra', 'reps', 'Core'],
  ['Prancha', 'time', 'Core'],
  ['Esteira', 'time', 'Cardio'],
  ['Bicicleta ergométrica', 'time', 'Cardio'],
]

/**
 * Popula o catálogo na primeira execução. Se o usuário apagar tudo, o seed
 * roda de novo — o que é o comportamento desejado para um app sem cadastro.
 */
export async function seedIfEmpty(): Promise<void> {
  const count = await db.exercises.count()
  if (count > 0) return

  const now = Date.now()
  const exercises: Exercise[] = SEED.map(([name, kind, muscleGroup], i) => ({
    id: newId(),
    name,
    kind,
    muscleGroup,
    archived: 0,
    createdAt: now + i,
  }))

  await db.exercises.bulkAdd(exercises)
}
