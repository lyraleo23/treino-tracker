import Dexie, { type Table } from 'dexie'
import { newId } from '../lib/id'

/**
 * Repetições (peso × reps), tempo (duração) ou aeróbico (esteira, bicicleta,
 * corrida — com velocidade, inclinação e afins).
 */
export type ExerciseKind = 'reps' | 'time' | 'cardio'

/**
 * Métricas que um exercício aeróbico usa. São sete no total, mas nenhum
 * aparelho usa todas: a esteira não tem resistência, a bicicleta não tem
 * inclinação. Cada exercício declara as suas para a tela ficar enxuta.
 */
export type CardioField =
  | 'seconds'
  | 'distance'
  | 'speed'
  | 'incline'
  | 'resistance'
  | 'heartRate'
  | 'calories'

export const DEFAULT_CARDIO_FIELDS: CardioField[] = ['seconds', 'speed', 'incline']

/** Incremento de carga padrão, em kg. */
export const DEFAULT_WEIGHT_STEP = 2.5

/**
 * Proporções da escada de carga, todas relativas ao working set (100%). Os
 * feeders são interpolados entre `feederMin` e `feederMax`.
 */
export interface LadderRatios {
  warmup: number
  feederMin: number
  feederMax: number
}

export const DEFAULT_LADDER_RATIOS: LadderRatios = {
  warmup: 0.5,
  feederMin: 0.7,
  feederMax: 0.85,
}

export interface HydrationSettings {
  goalMl: number
}

export const DEFAULT_HYDRATION: HydrationSettings = { goalMl: 2500 }

export interface NutritionSettings {
  kcalMin: number
  kcalMax: number
}

export const DEFAULT_NUTRITION: NutritionSettings = { kcalMin: 2201, kcalMax: 2400 }

/**
 * Linha única de configuração do app — `id` é sempre 'app'. Quando ela não
 * existe, quem lê cai nos padrões, então não há o que semear.
 */
export interface Settings {
  id: 'app'
  ladder: LadderRatios
  /** Ausente na linha gravada antes da hidratação existir. */
  hydration?: HydrationSettings
  /** Ausente na linha gravada antes da nutrição existir. */
  nutrition?: NutritionSettings
}

// --- Hidratação ---------------------------------------------------------

/** Uma bebida do catálogo: água, café, suco... */
export interface Drink {
  id: string
  name: string
  /**
   * Quanto do volume conta para a meta: 1 é integral, 0,8 conta 80%. Mora no
   * catálogo, e não no código, porque a evidência sobre o quanto cada bebida
   * hidrata é frouxa — quem usa calibra conforme acredita.
   */
  factor: number
  order: number
  archived: Flag
  createdAt: number
}

/** Um recipiente e o quanto ele leva. */
export interface Container {
  id: string
  name: string
  ml: number
  order: number
  archived: Flag
  createdAt: number
}

/** Combinação salva: um toque registra esta bebida neste recipiente. */
export interface DrinkShortcut {
  id: string
  drinkId: string
  containerId: string
  order: number
}

/** Um consumo registrado. */
export interface DrinkLog {
  id: string
  /** Meia-noite local do dia: agrupa sem varrer a tabela inteira. */
  day: number
  at: number
  drinkId: string
  /** O que foi bebido. */
  ml: number
  /** O que contou para a meta, congelado pelo fator vigente no registro. */
  countedMl: number
}

/**
 * O dia, com a meta que valia nele. Congelar a meta (e o `countedMl` de cada
 * registro) é o que impede o passado de ser reescrito: sem isso, subir a meta
 * ou recalibrar um fator faria dias antes batidos passarem a falhados.
 */
export interface HydrationDay {
  day: number
  goalMl: number
}

/** Flag booleana persistida como 0/1 porque o IndexedDB não indexa boolean. */
export type Flag = 0 | 1

// --- Nutrição ------------------------------------------------------------

/**
 * Um alimento do catálogo, com a nutrição por unidade-base. `baseUnit` é
 * texto livre ('un', 'g', 'ml', 'fatia', 'tbsp', 'tsp', 'portion',
 * 'un_serving') porque a dieta de origem usa unidades heterogêneas por
 * alimento — não faz sentido normalizar tudo para grama.
 */
export interface Food {
  id: string
  name: string
  baseUnit: string
  /** null quando a fonte não define nutrição (ex.: fruta variável do dia). */
  caloriesPerBaseUnit: number | null
  proteinPerBaseUnit: number | null
  carbsPerBaseUnit: number | null
  fatPerBaseUnit: number | null
  nutritionEstimated: boolean
  order: number
  archived: Flag
  createdAt: number
}

/** Um item dentro de uma opção do plano — a sugestão, não o que foi comido. */
export interface DietIngredient {
  foodId: string
  quantity: number
  unit: string
  /** Ingredientes que se substituem entre si dentro da mesma opção (ex.: kiwi OU papaia). */
  alternativeGroup?: string
  /** Quantidade não conversível de forma exata para o base_unit do alimento (ex.: "1 fio" de azeite). */
  estimated?: boolean
}

export type DietSelectionMode = 'one_from_each_category' | 'one_option'

/** Uma refeição fixa do dia: café da manhã, almoço... Dado de plano, não de execução. */
export interface DietMeal {
  id: string
  name: string
  order: number
  selectionMode: DietSelectionMode
  /** Chaves livres (ex.: {protein: 1, carbohydrate: 1} ou {options: 1}), batem com a categoria das DietOption da refeição. */
  selectionRules: Record<string, number>
  optionalSides?: string[]
}

/** Uma alternativa dentro de uma categoria de uma refeição: "Frango desfiado". */
export interface DietOption {
  id: string
  mealId: string
  /** 'protein' | 'carbohydrate' | 'options' — texto livre, não fixo no código. */
  category: string
  name: string
  order: number
  ingredients: DietIngredient[]
  /**
   * Linhas do `alternative`/`alternative_group` da fonte, pré-preenchidas com
   * quantidade 0 no registro — a troca acontece editando quantidade, não por
   * um seletor de escolha exclusiva.
   */
  alternativeIngredients?: DietIngredient[]
  alternativeLogic?: string
  notes?: string[]
  preparation?: string
}

/** Uma ocasião em que uma refeição foi registrada. */
export interface MealLog {
  id: string
  /** Meia-noite local do dia. */
  day: number
  mealId: string
  at: number
}

/** Um alimento efetivamente registrado dentro de um MealLog. */
export interface MealLogItem {
  id: string
  mealLogId: string
  /** Denormalizado do MealLog: soma o dia inteiro num único índice, sem N+1. */
  day: number
  foodId: string
  quantity: number
  unit: string
  /** Nutrição computada e congelada no momento do registro. */
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  /** false quando o alimento não tinha nutrição conhecida ou a unidade não batia com o base_unit — os quatro campos acima ficam 0. */
  nutritionKnown: boolean
}

/**
 * O dia, com a faixa de kcal que valia nele — mesmo motivo do HydrationDay:
 * mudar a meta agora não pode reescrever se um dia passado bateu ou não.
 */
export interface NutritionDay {
  day: number
  kcalMin: number
  kcalMax: number
}

/**
 * Exercício é uma entidade global do catálogo. Treinos apenas o referenciam,
 * e todo SetLog guarda o exerciseId — é isso que faz o peso ser lembrado
 * em qualquer treino ou sessão.
 */
export interface Exercise {
  id: string
  name: string
  kind: ExerciseKind
  muscleGroup?: string
  notes?: string
  /** Foto já redimensionada; guardada como Blob para funcionar offline. */
  photo?: Blob
  photoUpdatedAt?: number
  /** Link para vídeo de execução, aberto fora do app. */
  videoUrl?: string
  /** Só para kind 'cardio'; ausente usa DEFAULT_CARDIO_FIELDS. */
  cardioFields?: CardioField[]
  /**
   * De quanto em quanto a carga sobe neste aparelho: 2,5 kg na barra, 1 kg num
   * haltere pequeno, 5 kg no leg press. Ausente usa DEFAULT_WEIGHT_STEP.
   */
  weightStep?: number
  archived: Flag
  createdAt: number
}

/** Fim do ciclo do programa: por data-limite ou por número de sessões. */
export type Cycle =
  | { kind: 'date'; until: number }
  | { kind: 'sessions'; target: number }

/**
 * Uma bateria de treinos: "Treino de Agosto". Trocar de programa é arquivar o
 * atual e ativar outro — o plano antigo continua inteiro, só sai da frente.
 * Exatamente um programa fica ativo por vez.
 */
export interface Program {
  id: string
  name: string
  order: number
  /** 0 é o programa ativo; 1 é guardado. */
  archived: Flag
  createdAt: number
  cycle?: Cycle
  /** Renovar o ciclo é só reposicionar isto; zera a contagem de sessões. */
  cycleStartedAt?: number
}

/** Um treino: "Treino A", "Treino B"... sempre dentro de um programa. */
export interface Workout {
  id: string
  programId: string
  name: string
  order: number
  archived: Flag
  createdAt: number
}

export type Target =
  | { kind: 'reps'; value: number }
  | { kind: 'repsRange'; min: number; max: number }
  | { kind: 'time'; seconds: number }
  /** Prescrição de um trecho aeróbico: "4 min a 6% e 4,2 km/h". */
  | {
      kind: 'cardio'
      seconds?: number
      distance?: number
      speed?: number
      incline?: number
      resistance?: number
    }

/** Um exercício dentro de um treino. A prescrição fica nos blocos. */
export interface WorkoutItem {
  id: string
  workoutId: string
  exerciseId: string
  order: number
}

/**
 * Tipos de bloco de séries. Só `working` e `top` valem como critério de
 * progressão de carga — a faixa de aquecimento e feeder existe para preparar,
 * não para medir evolução.
 */
export type BlockKind =
  | 'warmup'
  | 'feeder'
  | 'working'
  | 'top'
  | 'backoff'
  | 'drop'
  | 'amrap'
  /** Trecho de um set aeróbico: cada um com sua velocidade e inclinação. */
  | 'interval'

/**
 * Um grupo de séries com a mesma prescrição dentro de um exercício:
 * "Feeder Set 1 — 2 séries de 5 a 6 reps, intervalo de 1 min".
 */
export interface SetBlock {
  id: string
  workoutItemId: string
  order: number
  kind: BlockKind
  /** Vazio usa o rótulo automático ("Feeder Set 2"). */
  label?: string
  sets: number
  target: Target
  restSeconds?: number
  /** Preenchido quando o intervalo é uma faixa ("2 a 3 min"). */
  restSecondsMax?: number
  note?: string
}

/** Uma execução de um treino. */
export interface Session {
  id: string
  workoutId: string
  /** Snapshot do nome: a sessão sobrevive à renomeação ou exclusão do treino. */
  workoutName: string
  startedAt: number
  finishedAt?: number
  notes?: string
  feeling?: string
  strongPoints?: string
  improvePoints?: string
}

/** Uma série efetivamente executada. */
export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  workoutItemId: string
  blockId: string
  setIndex: number
  weight?: number
  reps?: number
  seconds?: number
  // Executado num trecho aeróbico; velocidade sempre em km/h, o ritmo é derivado.
  distance?: number
  speed?: number
  incline?: number
  resistance?: number
  heartRate?: number
  calories?: number
  note?: string
  completedAt: number
}

/** Formato da v1, onde a prescrição morava no próprio item do treino. */
type LegacyWorkoutItem = WorkoutItem & {
  sets?: number
  target?: Target
  restSeconds?: number
}

/** Formato da v2, onde a validade morava em cada treino. */
type LegacyWorkout = Workout & {
  cycle?: Cycle
  cycleStartedAt?: number
}

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' })

/** "Treino de agosto" — nome de partida do programa, feito para ser trocado. */
export function defaultProgramName(at = Date.now()): string {
  return `Treino de ${monthFormatter.format(at)}`
}

class TreinoDB extends Dexie {
  exercises!: Table<Exercise, string>
  settings!: Table<Settings, string>
  drinks!: Table<Drink, string>
  containers!: Table<Container, string>
  drinkShortcuts!: Table<DrinkShortcut, string>
  drinkLogs!: Table<DrinkLog, string>
  hydrationDays!: Table<HydrationDay, number>
  foods!: Table<Food, string>
  dietMeals!: Table<DietMeal, string>
  dietOptions!: Table<DietOption, string>
  mealLogs!: Table<MealLog, string>
  mealLogItems!: Table<MealLogItem, string>
  nutritionDays!: Table<NutritionDay, number>
  programs!: Table<Program, string>
  workouts!: Table<Workout, string>
  workoutItems!: Table<WorkoutItem, string>
  setBlocks!: Table<SetBlock, string>
  sessions!: Table<Session, string>
  setLogs!: Table<SetLog, string>

  constructor() {
    super('treino-tracker')

    this.version(1).stores({
      exercises: 'id, name, kind, archived',
      workouts: 'id, order, archived',
      workoutItems: 'id, workoutId, exerciseId, [workoutId+order]',
      sessions: 'id, workoutId, startedAt, finishedAt',
      // O índice composto atende as duas consultas quentes: último peso do
      // exercício e a série histórica do gráfico de evolução.
      setLogs: 'id, sessionId, exerciseId, completedAt, [exerciseId+completedAt]',
    })

    this.version(2)
      .stores({
        setBlocks: 'id, workoutItemId, [workoutItemId+order]',
        setLogs:
          'id, sessionId, exerciseId, blockId, completedAt, [exerciseId+completedAt], [blockId+completedAt]',
      })
      .upgrade(async (tx) => {
        // Cada exercício da v1 tinha uma única prescrição: ela vira um bloco
        // working, e as séries já registradas passam a apontar para ele.
        const items = await tx.table<LegacyWorkoutItem>('workoutItems').toArray()
        const blockByItem = new Map<string, string>()

        const blocks: SetBlock[] = items.map((item) => {
          const id = newId()
          blockByItem.set(item.id, id)
          return {
            id,
            workoutItemId: item.id,
            order: 0,
            kind: 'working',
            sets: item.sets ?? 3,
            target: item.target ?? { kind: 'repsRange', min: 8, max: 12 },
            restSeconds: item.restSeconds,
          }
        })

        await tx.table('setBlocks').bulkAdd(blocks)

        await tx
          .table('workoutItems')
          .toCollection()
          .modify((item: LegacyWorkoutItem) => {
            delete item.sets
            delete item.target
            delete item.restSeconds
          })

        await tx
          .table('setLogs')
          .toCollection()
          .modify((log: SetLog) => {
            log.blockId = blockByItem.get(log.workoutItemId) ?? ''
          })
      })

    this.version(3)
      .stores({
        programs: 'id, order, archived',
        workouts: 'id, programId, order, archived, [programId+order]',
      })
      .upgrade(async (tx) => {
        // Os treinos soltos da v2 viram a primeira bateria, e a validade que
        // vivia em cada um sobe para ela.
        const workouts = await tx.table<LegacyWorkout>('workouts').toArray()

        // Só dá para herdar a validade se todos concordarem: com ciclos
        // divergentes não há como escolher qual deles manda, então o programa
        // nasce sem validade em vez de eleger um por conta própria.
        const comCiclo = workouts.filter((w) => w.cycle)
        const distintos = new Set(comCiclo.map((w) => JSON.stringify(w.cycle)))
        const herdado = distintos.size === 1 ? comCiclo[0] : undefined

        const now = Date.now()
        const program: Program = {
          id: newId(),
          name: defaultProgramName(now),
          order: 0,
          archived: 0,
          createdAt: now,
          cycle: herdado?.cycle,
          cycleStartedAt: herdado
            ? Math.min(...comCiclo.map((w) => w.cycleStartedAt ?? w.createdAt))
            : undefined,
        }

        await tx.table('programs').add(program)

        await tx
          .table('workouts')
          .toCollection()
          .modify((workout: LegacyWorkout) => {
            workout.programId = program.id
            delete workout.cycle
            delete workout.cycleStartedAt
          })
      })

    // Sem `.upgrade()`: não há dado a transformar. A tabela nasce vazia e a
    // leitura cai nos padrões enquanto ninguém salvar nada.
    this.version(4).stores({ settings: 'id' })

    // Idem: tabelas novas, sem dado antigo para converter. O catálogo é semeado
    // pelo `ensureHydrationCatalog`, que roda em toda abertura do app.
    this.version(5).stores({
      drinks: 'id, order, archived',
      containers: 'id, order, archived',
      drinkShortcuts: 'id, order, drinkId, containerId',
      drinkLogs: 'id, day, drinkId, [day+at]',
      hydrationDays: 'day',
    })

    // Idem: tabelas novas, sem dado antigo para converter. O catálogo de
    // dieta é semeado pelo `ensureDietCatalog`, que roda em toda abertura.
    this.version(6).stores({
      foods: 'id, order, archived',
      dietMeals: 'id, order',
      dietOptions: 'id, mealId, category, order, [mealId+category]',
      mealLogs: 'id, day, mealId, [day+at]',
      mealLogItems: 'id, mealLogId, day, foodId',
      nutritionDays: 'day',
    })
  }
}

export const db = new TreinoDB()
