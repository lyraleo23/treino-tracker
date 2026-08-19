import {
  db,
  defaultProgramName,
  type Container,
  type Cycle,
  type Drink,
  type DrinkLog,
  type DrinkShortcut,
  type Exercise,
  type Flag,
  type HydrationDay,
  type Program,
  type Session,
  type Settings,
  type SetBlock,
  type SetLog,
  type Workout,
  type WorkoutItem,
} from './db'
import { newId } from '../lib/id'
import { blobToDataUrl, dataUrlToBlob } from '../lib/image'

const FORMAT = 'treino-tracker-backup'
const VERSION = 6

/** No arquivo a foto vira data URL: Blob não sobrevive a JSON. */
type ExerciseDoc = Omit<Exercise, 'photo'> & { photo?: string }

export interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  exercises: ExerciseDoc[]
  /** Ausente nos arquivos anteriores à v5; quem lê cai nos padrões. */
  settings?: Settings[]
  /** Ausentes antes da v6; lidos com `?? []` para o arquivo antigo entrar. */
  drinks?: Drink[]
  containers?: Container[]
  drinkShortcuts?: DrinkShortcut[]
  drinkLogs?: DrinkLog[]
  hydrationDays?: HydrationDay[]
  programs: Program[]
  workouts: Workout[]
  workoutItems: WorkoutItem[]
  setBlocks: SetBlock[]
  sessions: Session[]
  setLogs: SetLog[]
}

export async function exportBackup(includePhotos = true): Promise<Backup> {
  const [
    rawExercises,
    settings,
    drinks,
    containers,
    drinkShortcuts,
    drinkLogs,
    hydrationDays,
    programs,
    workouts,
    workoutItems,
    setBlocks,
    sessions,
    setLogs,
  ] = await Promise.all([
      db.exercises.toArray(),
      db.settings.toArray(),
      db.drinks.toArray(),
      db.containers.toArray(),
      db.drinkShortcuts.toArray(),
      db.drinkLogs.toArray(),
      db.hydrationDays.toArray(),
      db.programs.toArray(),
      db.workouts.toArray(),
      db.workoutItems.toArray(),
      db.setBlocks.toArray(),
      db.sessions.toArray(),
      db.setLogs.toArray(),
    ])

  const exercises: ExerciseDoc[] = await Promise.all(
    rawExercises.map(async ({ photo, ...exercise }) => ({
      ...exercise,
      photo: includePhotos && photo ? await blobToDataUrl(photo) : undefined,
    })),
  )

  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    settings,
    drinks,
    containers,
    drinkShortcuts,
    drinkLogs,
    hydrationDays,
    programs,
    workouts,
    workoutItems,
    setBlocks,
    sessions,
    setLogs,
  }
}

function isBackup(value: unknown): value is Backup {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Backup>
  return (
    candidate.format === FORMAT &&
    Array.isArray(candidate.exercises) &&
    Array.isArray(candidate.workouts) &&
    Array.isArray(candidate.workoutItems) &&
    Array.isArray(candidate.sessions) &&
    Array.isArray(candidate.setLogs)
  )
}

/** Backup da v1: a prescrição vinha no item e não havia blocos. */
type LegacyItem = WorkoutItem & { sets?: number; target?: SetBlock['target'] }

/**
 * Converte um arquivo da v1 para o formato atual, gerando um bloco working por
 * exercício — a mesma transformação que a migração do banco faz.
 */
function migrateToV2(backup: Backup): Backup {
  if ((backup.version ?? 1) >= 2 && Array.isArray(backup.setBlocks)) return backup

  const blockByItem = new Map<string, string>()
  const setBlocks: SetBlock[] = (backup.workoutItems as LegacyItem[]).map((item) => {
    const id = newId()
    blockByItem.set(item.id, id)
    return {
      id,
      workoutItemId: item.id,
      order: 0,
      kind: 'working',
      sets: item.sets ?? 3,
      target: item.target ?? { kind: 'repsRange', min: 8, max: 12 },
    }
  })

  return {
    ...backup,
    version: VERSION,
    setBlocks,
    // Sem os campos da v1 o item não carrega prescrição duplicada para sempre.
    workoutItems: (backup.workoutItems as LegacyItem[]).map(
      ({ sets: _sets, target: _target, ...item }) => item,
    ),
    setLogs: backup.setLogs.map((log) => ({
      ...log,
      blockId: log.blockId || (blockByItem.get(log.workoutItemId) ?? ''),
    })),
  }
}

/** Backup da v3: treinos soltos, cada um com a sua validade. */
type LegacyWorkoutDoc = Workout & { cycle?: Cycle; cycleStartedAt?: number }

/**
 * Cria o programa que faltava e adota os treinos do arquivo, subindo a validade
 * deles — a mesma transformação que a migração v3 do banco faz. Com ciclos
 * divergentes o programa nasce sem validade: não há como eleger qual vence.
 */
function migrateToV4(backup: Backup): Backup {
  if ((backup.version ?? 1) >= 4 && Array.isArray(backup.programs)) return backup

  const legacy = backup.workouts as LegacyWorkoutDoc[]
  const comCiclo = legacy.filter((w) => w.cycle)
  const distintos = new Set(comCiclo.map((w) => JSON.stringify(w.cycle)))
  const herdado = distintos.size === 1 ? comCiclo[0] : undefined

  const now = Date.now()
  const program: Program = {
    id: newId(),
    // Marcado como importado: mesclar um plano antigo dentro de um app que já
    // tem programas criaria dois "Treino de agosto" indistinguíveis na lista.
    name: `${defaultProgramName(now)} (importado)`,
    order: 0,
    archived: 0,
    createdAt: now,
    cycle: herdado?.cycle,
    cycleStartedAt: herdado
      ? Math.min(...comCiclo.map((w) => w.cycleStartedAt ?? w.createdAt))
      : undefined,
  }

  return {
    ...backup,
    version: VERSION,
    programs: [program],
    workouts: legacy.map(({ cycle: _cycle, cycleStartedAt: _started, ...workout }) => ({
      ...workout,
      programId: workout.programId || program.id,
    })),
  }
}

/**
 * Deixa exatamente um programa ativo. O arquivo traz o seu próprio ativo e
 * colide com o daqui — e com dois ativos a aba Treinos escolheria um por
 * sorteio. `preferId` é quem estava ativo antes: importar um plano não deve
 * trocar a bateria que a pessoa está treinando.
 */
async function normalizeActiveProgram(preferId?: string): Promise<void> {
  const programs = await db.programs.orderBy('order').toArray()
  if (programs.length === 0) return

  const escolhido =
    programs.find((p) => p.id === preferId) ??
    programs.find((p) => p.archived === 0) ??
    programs[0]!

  for (const program of programs) {
    const archived: Flag = program.id === escolhido.id ? 0 : 1
    if (program.archived !== archived) {
      await db.programs.update(program.id, { archived })
    }
  }
}

export type ImportMode = 'merge' | 'replace'

/** Compara nomes ignorando maiúsculas, acentos e espaços sobrando. */
function normalizeName(name: string): string {
  // \p{Diacritic} evita depender de caracteres combinantes invisíveis no fonte.
  const DIACRITICOS = /\p{Diacritic}/gu
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS, '')
}

/**
 * Converte as fotos de volta para Blob. Precisa acontecer **antes** de abrir a
 * transação: esperar uma promise de fora do Dexie lá dentro encerra a transação.
 */
async function toExercises(docs: ExerciseDoc[]): Promise<Exercise[]> {
  return Promise.all(
    docs.map(async ({ photo, ...exercise }) => ({
      ...exercise,
      photo: photo ? await dataUrlToBlob(photo) : undefined,
    })),
  )
}

function parseBackup(raw: string): Backup {
  const parsed: unknown = JSON.parse(raw)
  if (!isBackup(parsed)) {
    throw new Error('Arquivo não é um backup válido do Treino Tracker.')
  }
  if ((parsed.version ?? 1) > VERSION) {
    throw new Error('Backup gerado por uma versão mais nova do app.')
  }
  return migrateToV4(migrateToV2(parsed))
}

/**
 * Mescla o arquivo com o que já existe, sem apagar o que ele não menciona.
 * É o modo para receber um plano atualizado: sessões e séries — o histórico de
 * carga, que não dá para recriar — só são tocadas se vierem no arquivo.
 */
export async function mergeBackup(raw: string): Promise<void> {
  const backup = parseBackup(raw)
  const exercisesFromFile = await toExercises(backup.exercises)

  await db.transaction(
    'rw',
    [
      db.exercises,
      db.settings,
      db.drinks,
      db.containers,
      db.drinkShortcuts,
      db.drinkLogs,
      db.hydrationDays,
      db.programs,
      db.workouts,
      db.workoutItems,
      db.setBlocks,
      db.sessions,
      db.setLogs,
    ],
    async () => {
      const existentes = await db.exercises.toArray()
      const porNome = new Map(existentes.map((e) => [normalizeName(e.name), e]))
      const porId = new Map(existentes.map((e) => [e.id, e]))

      // idNoArquivo → idNoBanco: é o que mantém o histórico colado no exercício
      // certo em vez de criar uma cópia com outro id.
      const mapaExercicios = new Map<string, string>()

      for (const vindo of exercisesFromFile) {
        const mesmoId = porId.get(vindo.id)
        if (mesmoId) {
          await db.exercises.put({ ...mesmoId, ...vindo })
          mapaExercicios.set(vindo.id, vindo.id)
          continue
        }

        const mesmoNome = porNome.get(normalizeName(vindo.name))
        if (mesmoNome) {
          // Preserva nome e tipo do que já existe; só preenche o que falta.
          await db.exercises.update(mesmoNome.id, {
            muscleGroup: mesmoNome.muscleGroup ?? vindo.muscleGroup,
            notes: mesmoNome.notes ?? vindo.notes,
            videoUrl: mesmoNome.videoUrl ?? vindo.videoUrl,
            photo: mesmoNome.photo ?? vindo.photo,
          })
          mapaExercicios.set(vindo.id, mesmoNome.id)
          continue
        }

        await db.exercises.put(vindo)
        mapaExercicios.set(vindo.id, vindo.id)
      }

      const resolver = (id: string) => mapaExercicios.get(id) ?? id

      // Guardado antes do bulkPut: o arquivo traz o ativo dele junto.
      const ativoAntes = await db.programs.filter((p) => p.archived === 0).first()

      await db.settings.bulkPut(backup.settings ?? [])
      await db.drinks.bulkPut(backup.drinks ?? [])
      await db.containers.bulkPut(backup.containers ?? [])
      await db.drinkShortcuts.bulkPut(backup.drinkShortcuts ?? [])
      await db.drinkLogs.bulkPut(backup.drinkLogs ?? [])
      await db.hydrationDays.bulkPut(backup.hydrationDays ?? [])
      await db.programs.bulkPut(backup.programs)
      await db.workouts.bulkPut(backup.workouts)

      // Para cada treino do arquivo, os filhos passam a ser exatamente os do
      // arquivo — mantendo os ids, para SetLog.blockId continuar válido.
      for (const workout of backup.workouts) {
        const itensDoArquivo = backup.workoutItems.filter((i) => i.workoutId === workout.id)
        const idsDoArquivo = new Set(itensDoArquivo.map((i) => i.id))

        const atuais = await db.workoutItems.where('workoutId').equals(workout.id).toArray()
        for (const atual of atuais) {
          if (!idsDoArquivo.has(atual.id)) {
            await db.setBlocks.where('workoutItemId').equals(atual.id).delete()
            await db.workoutItems.delete(atual.id)
          }
        }

        await db.workoutItems.bulkPut(
          itensDoArquivo.map((item) => ({ ...item, exerciseId: resolver(item.exerciseId) })),
        )

        for (const item of itensDoArquivo) {
          const blocosDoArquivo = backup.setBlocks.filter((b) => b.workoutItemId === item.id)
          const idsBlocos = new Set(blocosDoArquivo.map((b) => b.id))

          const blocosAtuais = await db.setBlocks
            .where('workoutItemId')
            .equals(item.id)
            .toArray()
          for (const bloco of blocosAtuais) {
            if (!idsBlocos.has(bloco.id)) await db.setBlocks.delete(bloco.id)
          }

          await db.setBlocks.bulkPut(blocosDoArquivo)
        }
      }

      // Arquivo de plano vem sem histórico: nesse caso não se toca em nada.
      if (backup.sessions.length > 0) await db.sessions.bulkPut(backup.sessions)
      if (backup.setLogs.length > 0) {
        await db.setLogs.bulkPut(
          backup.setLogs.map((log) => ({ ...log, exerciseId: resolver(log.exerciseId) })),
        )
      }

      await normalizeActiveProgram(ativoAntes?.id)
    },
  )
}

/**
 * Restaura substituindo todo o conteúdo atual — é o "voltar para este backup",
 * usado só na restauração completa.
 */
export async function importBackup(raw: string): Promise<void> {
  const backup = parseBackup(raw)
  const exercises = await toExercises(backup.exercises)

  await db.transaction(
    'rw',
    [
      db.exercises,
      db.settings,
      db.drinks,
      db.containers,
      db.drinkShortcuts,
      db.drinkLogs,
      db.hydrationDays,
      db.programs,
      db.workouts,
      db.workoutItems,
      db.setBlocks,
      db.sessions,
      db.setLogs,
    ],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.settings.clear(),
        db.drinks.clear(),
        db.containers.clear(),
        db.drinkShortcuts.clear(),
        db.drinkLogs.clear(),
        db.hydrationDays.clear(),
        db.programs.clear(),
        db.workouts.clear(),
        db.workoutItems.clear(),
        db.setBlocks.clear(),
        db.sessions.clear(),
        db.setLogs.clear(),
      ])
      await Promise.all([
        db.exercises.bulkAdd(exercises),
        db.settings.bulkAdd(backup.settings ?? []),
        db.drinks.bulkAdd(backup.drinks ?? []),
        db.containers.bulkAdd(backup.containers ?? []),
        db.drinkShortcuts.bulkAdd(backup.drinkShortcuts ?? []),
        db.drinkLogs.bulkAdd(backup.drinkLogs ?? []),
        db.hydrationDays.bulkAdd(backup.hydrationDays ?? []),
        db.programs.bulkAdd(backup.programs),
        db.workouts.bulkAdd(backup.workouts),
        db.workoutItems.bulkAdd(backup.workoutItems),
        db.setBlocks.bulkAdd(backup.setBlocks),
        db.sessions.bulkAdd(backup.sessions),
        db.setLogs.bulkAdd(backup.setLogs),
      ])

      await normalizeActiveProgram()
    },
  )
}

export async function wipeAll(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.exercises,
      db.settings,
      db.drinks,
      db.containers,
      db.drinkShortcuts,
      db.drinkLogs,
      db.hydrationDays,
      db.programs,
      db.workouts,
      db.workoutItems,
      db.setBlocks,
      db.sessions,
      db.setLogs,
    ],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.settings.clear(),
        db.drinks.clear(),
        db.containers.clear(),
        db.drinkShortcuts.clear(),
        db.drinkLogs.clear(),
        db.hydrationDays.clear(),
        db.programs.clear(),
        db.workouts.clear(),
        db.workoutItems.clear(),
        db.setBlocks.clear(),
        db.sessions.clear(),
        db.setLogs.clear(),
      ])
    },
  )
}
