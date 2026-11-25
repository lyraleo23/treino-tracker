import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import { db, type Exercise, type ExerciseKind } from '../db/db'
import { deleteExercise, mergeExercises, setExerciseArchived } from '../db/actions'
import { ExercisePicker } from '../components/ExercisePicker'
import { getExerciseHistory, type ExercisePoint } from '../db/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/Modal'
import { ExerciseFormModal } from '../components/ExerciseFormModal'
import { ExercisePhoto } from '../components/ExercisePhoto'
import { DuelLadder } from '../components/DuelLadder'
import { VideoIcon } from '../components/icons'
import { openExternal } from '../lib/image'
import { readThemeTokens, useTheme } from '../lib/theme'
import { equivalentsOf, historyFilter, variantsOf } from '../lib/variants'
import {
  KIND_LABELS,
  formatDate,
  formatDateTime,
  formatNumber,
  formatSeconds,
} from '../lib/format'

// Presentation attributes de SVG não resolvem var() no Chrome, então as cores
// do gráfico são lidas dos tokens do tema ativo e passadas já resolvidas.
const CHART_TOKENS = ['accent', 'border', 'text-faint', 'surface'] as const

type Metric = {
  key: string
  label: string
  value: (point: ExercisePoint) => number
  format: (value: number) => string
}

const WEIGHT_METRICS: Metric[] = [
  {
    key: 'maxWeight',
    label: 'Peso máximo',
    value: (p) => p.maxWeight,
    format: (v) => `${formatNumber(v)} kg`,
  },
  {
    key: 'volume',
    label: 'Volume total',
    value: (p) => p.totalVolume,
    format: (v) => `${formatNumber(v, 0)} kg`,
  },
  {
    key: 'reps',
    label: 'Repetições',
    value: (p) => p.totalReps,
    format: (v) => `${formatNumber(v, 0)} reps`,
  },
]

/** Cabeçalhos das duas últimas colunas da tabela, por tipo de exercício. */
const TABLE_HEADS: Record<ExerciseKind, [string, string]> = {
  reps: ['Peso máx', 'Volume'],
  time: ['Melhor', 'Total'],
  cardio: ['Tempo', 'Distância'],
}

const CARDIO_METRICS: Metric[] = [
  {
    key: 'distance',
    label: 'Distância',
    value: (p) => p.totalDistance,
    format: (v) => `${formatNumber(v, 2)} km`,
  },
  {
    key: 'totalSeconds',
    label: 'Tempo total',
    value: (p) => p.totalSeconds,
    format: formatSeconds,
  },
  {
    key: 'avgSpeed',
    label: 'Velocidade média',
    value: (p) => p.avgSpeed,
    format: (v) => `${formatNumber(v)} km/h`,
  },
]

const TIME_METRICS: Metric[] = [
  {
    key: 'maxSeconds',
    label: 'Melhor tempo',
    value: (p) => p.maxSeconds,
    format: formatSeconds,
  },
  {
    key: 'totalSeconds',
    label: 'Tempo total',
    value: (p) => p.totalSeconds,
    format: formatSeconds,
  },
]

function ChartTooltip({
  active,
  payload,
  format,
  metricLabel,
}: TooltipProps<number, string> & { format: (value: number) => string; metricLabel: string }) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  if (!point) return null

  return (
    <div className="tooltip">
      <div className="tooltip__label">{point.payload.fullDate}</div>
      <strong>
        {metricLabel}: {format(Number(point.value))}
      </strong>
    </div>
  )
}

/** Origem opcional: consultar o exercício no meio do treino deve voltar para ele. */
interface FromState {
  from?: string
  label?: string
  /** Forma que estava sendo feita: o gráfico já abre nela. */
  variantId?: string
}

export function ExerciseHistoryPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation()
  const origin = (state ?? {}) as FromState
  const backTo = origin.from ?? '/exercicios'
  const backLabel = origin.label ?? 'Exercícios'
  const [metricKey, setMetricKey] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<Exercise | null>(null)
  /** Forma do gráfico; `undefined` junta todas. */
  const [variantFilter, setVariantFilter] = useState<string | undefined>(origin.variantId)

  const theme = useTheme()
  const chartColors = useMemo(() => {
    const tokens = readThemeTokens(CHART_TOKENS)
    return {
      line: tokens.accent,
      grid: tokens.border,
      axis: tokens['text-faint'],
      dotRing: tokens.surface,
    }
    // O tema não entra no cálculo, mas é o que muda os tokens: relê ao trocar.
  }, [theme])

  const exercise = useLiveQuery(
    async () => (exerciseId ? ((await db.exercises.get(exerciseId)) ?? null) : null),
    [exerciseId],
  )

  const history = useLiveQuery(async () => {
    if (!exerciseId) return []
    const current = await db.exercises.get(exerciseId)
    const selected =
      current && variantsOf(current).some((v) => v.id === variantFilter)
        ? historyFilter(current, variantFilter)
        : undefined
    return getExerciseHistory(exerciseId, selected)
  }, [exerciseId, variantFilter])

  const equivalents = useLiveQuery(async () => {
    if (!exerciseId) return []
    const all = await db.exercises.toArray()
    const current = all.find((e) => e.id === exerciseId)
    return current ? equivalentsOf(current, all) : []
  }, [exerciseId])

  /**
   * Treinos onde os dois exercícios convivem. Mesclar ali deixa o treino com
   * duas entradas do mesmo exercício — não quebra nada, mas confunde, então o
   * aviso sai antes de confirmar.
   */
  const conflitos = useLiveQuery(async () => {
    if (!exerciseId || !mergeTarget) return []

    const itens = await db.workoutItems
      .where('exerciseId')
      .anyOf([exerciseId, mergeTarget.id])
      .toArray()

    const porTreino = new Map<string, Set<string>>()
    for (const item of itens) {
      const atual = porTreino.get(item.workoutId) ?? new Set<string>()
      atual.add(item.exerciseId)
      porTreino.set(item.workoutId, atual)
    }

    const ids = [...porTreino.entries()]
      .filter(([, exercicios]) => exercicios.size === 2)
      .map(([workoutId]) => workoutId)

    const workouts = await db.workouts.bulkGet(ids)
    return workouts.filter((w): w is NonNullable<typeof w> => !!w).map((w) => w.name)
  }, [exerciseId, mergeTarget?.id])

  const metrics =
    exercise?.kind === 'cardio'
      ? CARDIO_METRICS
      : exercise?.kind === 'time'
        ? TIME_METRICS
        : WEIGHT_METRICS

  // Sem escolha explícita, começa pela primeira métrica que tem dado: numa
  // esteira sem distância, mostrar "0 km" não diz nada.
  const withData = metrics.find((option) =>
    (history ?? []).some((point) => option.value(point) > 0),
  )
  const metric = metrics.find((m) => m.key === metricKey) ?? withData ?? metrics[0]!

  const hasDistance = (history ?? []).some((point) => point.totalDistance > 0)

  const chartData = useMemo(
    () =>
      (history ?? []).map((point) => ({
        label: formatDate(point.date),
        fullDate: formatDateTime(point.date),
        value: metric.value(point),
      })),
    [history, metric],
  )

  if (exercise === null) {
    return (
      <>
        <PageHeader title="Exercício" back backTo={backTo} backLabel={backLabel} />
        <div className="page">
          <EmptyState icon="🤔" title="Exercício não encontrado" />
        </div>
      </>
    )
  }

  if (!exercise || !history) return <div className="page" />

  const best = history.reduce(
    (max, point) => Math.max(max, metric.value(point)),
    0,
  )
  const latest = history.length > 0 ? metric.value(history[history.length - 1]!) : 0

  // Cada ponto é uma sessão com séries deste exercício: sem ponto, sem histórico.
  const temHistorico = history.length > 0

  return (
    <>
      <PageHeader
        title={exercise.name}
        subtitle={[
          exercise.muscleGroup,
          KIND_LABELS[exercise.kind],
          exercise.archived === 1 ? 'arquivado' : undefined,
        ]
          .filter(Boolean)
          .join(' · ')}
        back
        backTo={backTo}
        backLabel={backLabel}
        action={
          <button type="button" className="btn btn--sm" onClick={() => setEditing(true)}>
            Editar
          </button>
        }
      />

      <div className="page">
        <ExercisePhoto photo={exercise.photo} name={exercise.name} variant="hero" />

        {exercise.videoUrl && (
          <button
            type="button"
            className="btn btn--block"
            onClick={() => openExternal(exercise.videoUrl!)}
          >
            <VideoIcon /> Ver vídeo de execução
          </button>
        )}

        {exercise.notes && (
          <p className="hint" style={{ marginTop: 10 }}>
            {exercise.notes}
          </p>
        )}

        {equivalents && equivalents.length > 0 && (
          <p className="hint" style={{ marginTop: 10 }}>
            Equivalentes: {equivalents.map((other) => other.name).join(', ')}.
          </p>
        )}

        {variantsOf(exercise).length > 0 && (
          <div className="segmented" style={{ margin: '12px 0 10px' }}>
            <button
              type="button"
              aria-pressed={!variantsOf(exercise).some((v) => v.id === variantFilter)}
              onClick={() => setVariantFilter(undefined)}
            >
              Todas
            </button>
            {variantsOf(exercise).map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={variant.id === variantFilter}
                onClick={() => setVariantFilter(variant.id)}
              >
                {variant.name}
              </button>
            ))}
          </div>
        )}

        {history.length === 0 ? (
          <EmptyState
            icon="📈"
            title="Sem histórico ainda"
            description="Registre este exercício em uma sessão para ver a evolução aqui."
          />
        ) : (
          <>
            <div className="stats">
              <div className="stat">
                <div className="stat__value">{history.length}</div>
                <div className="stat__label">Sessões</div>
              </div>
              <div className="stat">
                <div className="stat__value">{metric.format(best)}</div>
                <div className="stat__label">Recorde</div>
              </div>
              <div className="stat">
                <div className="stat__value">{metric.format(latest)}</div>
                <div className="stat__label">Último</div>
              </div>
            </div>

            <h2 className="section-title">Evolução · {metric.label}</h2>

            {metrics.length > 1 && (
              <div className="segmented" style={{ marginBottom: 10 }}>
                {metrics.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={option.key === metric.key}
                    onClick={() => setMetricKey(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            <div className="chart">
              {history.length < 2 ? (
                <p className="chart__empty">
                  Registre este exercício em pelo menos duas sessões para ver a linha de
                  evolução.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 6, right: 14, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={chartColors.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: chartColors.grid }}
                      minTickGap={18}
                    />
                    <YAxis
                      width={44}
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: chartColors.axis, strokeDasharray: '3 3' }}
                      content={
                        <ChartTooltip format={metric.format} metricLabel={metric.label} />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chartColors.line}
                      strokeWidth={2}
                      // Sem animação de entrada: com a aba em segundo plano o
                      // rAF não roda e a linha ficaria invisível pela metade.
                      isAnimationActive={false}
                      dot={{ r: 4, fill: chartColors.line, strokeWidth: 0 }}
                      activeDot={{
                        r: 6,
                        fill: chartColors.line,
                        stroke: chartColors.dotRing,
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <h2 className="section-title">Últimas execuções</h2>
            <div className="card card--tight">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>{exercise.kind === 'cardio' ? 'Trechos' : 'Séries'}</th>
                    <th>{TABLE_HEADS[exercise.kind][0]}</th>
                    <th>
                      {exercise.kind === 'cardio' && !hasDistance
                        ? 'Vel. média'
                        : TABLE_HEADS[exercise.kind][1]}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...history]
                    .reverse()
                    .slice(0, 12)
                    .map((point) => (
                      <tr key={point.sessionId}>
                        <td>{formatDate(point.date)}</td>
                        <td>{point.sets}</td>
                        <td>
                          {exercise.kind === 'cardio'
                            ? formatSeconds(point.totalSeconds)
                            : exercise.kind === 'time'
                              ? formatSeconds(point.maxSeconds)
                              : `${formatNumber(point.maxWeight)} kg`}
                        </td>
                        <td>
                          {exercise.kind === 'cardio'
                            ? point.totalDistance > 0
                              ? `${formatNumber(point.totalDistance, 2)} km`
                              : `${formatNumber(point.avgSpeed)} km/h`
                            : exercise.kind === 'time'
                              ? formatSeconds(point.totalSeconds)
                              : `${formatNumber(point.totalVolume, 0)} kg`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DuelLadder exercise={exercise} />

        <div className="stack" style={{ marginTop: 22 }}>
          <button
            type="button"
            className="btn btn--block"
            onClick={() => setMerging(true)}
          >
            Mesclar com outro exercício
          </button>
          <p className="hint">
            Junta este a outro exercício: o histórico e as vagas nos treinos passam
            para ele, e este sai do catálogo.
          </p>

          {temHistorico ? (
            exercise.archived === 1 ? (
              <>
                <button
                  type="button"
                  className="btn btn--block btn--primary"
                  onClick={() => void setExerciseArchived(exercise.id, 0)}
                >
                  Desarquivar exercício
                </button>
                <p className="hint">
                  Ele volta para o catálogo e para o seletor de exercícios dos treinos.
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn--block"
                  onClick={() => setConfirmArchive(true)}
                >
                  Arquivar exercício
                </button>
                <p className="hint">
                  Sai do catálogo e do seletor dos treinos, mas o histórico e este
                  gráfico continuam aqui. Exercício com série registrada não se
                  exclui — apagar destruiria sessões passadas.
                </p>
              </>
            )
          ) : (
            <>
              <button
                type="button"
                className="btn btn--block btn--danger"
                onClick={() => setConfirmDelete(true)}
              >
                Excluir exercício
              </button>
              <p className="hint">
                Nunca teve série registrada, então some de vez — junto com os blocos
                que tiver montados nos treinos.
              </p>
            </>
          )}
        </div>
      </div>

      {editing && (
        <ExerciseFormModal exercise={exercise} onClose={() => setEditing(false)} />
      )}

      {merging && (
        <ExercisePicker
          title="Mesclar com qual exercício?"
          hint={`Tudo que está em "${exercise.name}" passa para o escolhido, e este some do catálogo.`}
          kind={exercise.kind}
          excludeIds={[exercise.id]}
          allowCreate={false}
          onClose={() => setMerging(false)}
          onPick={(alvo) => {
            setMerging(false)
            setMergeTarget(alvo)
          }}
        />
      )}

      {mergeTarget && (
        <ConfirmDialog
          title="Mesclar exercícios"
          message={[
            `As séries e as vagas nos treinos de "${exercise.name}" passam para "${mergeTarget.name}", e "${exercise.name}" sai do catálogo.`,
            conflitos && conflitos.length > 0
              ? `Atenção: os dois estão em ${conflitos.join(', ')} — o treino ficará com duas entradas de "${mergeTarget.name}", que você pode remover depois.`
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          confirmLabel="Mesclar"
          onCancel={() => setMergeTarget(null)}
          onConfirm={async () => {
            const destino = mergeTarget.id
            setMergeTarget(null)
            await mergeExercises(exercise.id, destino)
            navigate(`/exercicios/${destino}`, { replace: true })
          }}
        />
      )}

      {confirmArchive && (
        <ConfirmDialog
          title="Arquivar exercício"
          message={`"${exercise.name}" sai do catálogo e do seletor dos treinos. O histórico e o gráfico de evolução continuam acessíveis, e dá para desarquivar quando quiser.`}
          confirmLabel="Arquivar"
          onCancel={() => setConfirmArchive(false)}
          onConfirm={async () => {
            await setExerciseArchived(exercise.id, 1)
            setConfirmArchive(false)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir exercício"
          message={`"${exercise.name}" será removido do catálogo e de todos os treinos, junto com os blocos de série que tiver montados. Ele nunca teve série registrada, então nenhum histórico se perde.`}
          confirmLabel="Excluir"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteExercise(exercise.id)
            navigate('/exercicios', { replace: true })
          }}
        />
      )}
    </>
  )
}
