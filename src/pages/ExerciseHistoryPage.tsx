import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { db } from '../db/db'
import { deleteExercise } from '../db/actions'
import { getExerciseHistory, type ExercisePoint } from '../db/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/Modal'
import { ExerciseFormModal } from '../components/ExerciseFormModal'
import { formatDate, formatDateTime, formatNumber, formatSeconds } from '../lib/format'

// Cores literais: presentation attributes de SVG não resolvem var() no Chrome,
// então os tokens do CSS são espelhados aqui.
const CHART = {
  line: '#34d399',
  grid: '#2a303b',
  axis: '#6b7688',
}

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

export function ExerciseHistoryPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const navigate = useNavigate()
  const [metricKey, setMetricKey] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const exercise = useLiveQuery(
    async () => (exerciseId ? ((await db.exercises.get(exerciseId)) ?? null) : null),
    [exerciseId],
  )

  const history = useLiveQuery(
    async () => (exerciseId ? await getExerciseHistory(exerciseId) : []),
    [exerciseId],
  )

  const metrics = exercise?.kind === 'time' ? TIME_METRICS : WEIGHT_METRICS
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0]!

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
        <PageHeader title="Exercício" back backTo="/exercicios" />
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

  return (
    <>
      <PageHeader
        title={exercise.name}
        subtitle={[exercise.muscleGroup, exercise.kind === 'reps' ? 'Repetições' : 'Tempo']
          .filter(Boolean)
          .join(' · ')}
        back
        backTo="/exercicios"
        action={
          <button type="button" className="btn btn--sm" onClick={() => setEditing(true)}>
            Editar
          </button>
        }
      />

      <div className="page">
        {exercise.notes && (
          <p className="hint" style={{ marginTop: 0 }}>
            {exercise.notes}
          </p>
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
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: CHART.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: CHART.grid }}
                      minTickGap={18}
                    />
                    <YAxis
                      width={44}
                      tick={{ fill: CHART.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
                      content={
                        <ChartTooltip format={metric.format} metricLabel={metric.label} />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={CHART.line}
                      strokeWidth={2}
                      // Sem animação de entrada: com a aba em segundo plano o
                      // rAF não roda e a linha ficaria invisível pela metade.
                      isAnimationActive={false}
                      dot={{ r: 4, fill: CHART.line, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: CHART.line, stroke: '#161a21', strokeWidth: 2 }}
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
                    <th>Séries</th>
                    <th>{exercise.kind === 'time' ? 'Melhor' : 'Peso máx'}</th>
                    <th>{exercise.kind === 'time' ? 'Total' : 'Volume'}</th>
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
                          {exercise.kind === 'time'
                            ? formatSeconds(point.maxSeconds)
                            : `${formatNumber(point.maxWeight)} kg`}
                        </td>
                        <td>
                          {exercise.kind === 'time'
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

        <div className="stack" style={{ marginTop: 22 }}>
          <button
            type="button"
            className="btn btn--block btn--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Excluir exercício
          </button>
          <p className="hint">
            O exercício sai do catálogo e dos treinos, mas o histórico das sessões
            permanece.
          </p>
        </div>
      </div>

      {editing && (
        <ExerciseFormModal exercise={exercise} onClose={() => setEditing(false)} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir exercício"
          message={`"${exercise.name}" será removido do catálogo e de todos os treinos.`}
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
