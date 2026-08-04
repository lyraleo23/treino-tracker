import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { formatDateTime, formatNumber, formatSeconds, formatWeekday } from '../lib/format'

export function HistoryPage() {
  const navigate = useNavigate()

  const sessions = useLiveQuery(async () => {
    const all = await db.sessions.orderBy('startedAt').reverse().toArray()
    const logs = await db.setLogs.toArray()

    return all.map((session) => {
      const own = logs.filter((log) => log.sessionId === session.id)
      return {
        session,
        sets: own.length,
        exercises: new Set(own.map((log) => log.exerciseId)).size,
        volume: own.reduce((sum, log) => sum + (log.weight ?? 0) * (log.reps ?? 0), 0),
        seconds: own.reduce((sum, log) => sum + (log.seconds ?? 0), 0),
      }
    })
  }, [])

  return (
    <>
      <PageHeader
        title="Histórico"
        subtitle={sessions ? `${sessions.length} sessões registradas` : undefined}
      />

      <div className="page">
        {sessions && sessions.length === 0 && (
          <EmptyState
            icon="📆"
            title="Nenhuma sessão ainda"
            description="Inicie um treino na aba Treinos para começar a registrar."
          />
        )}

        <div className="list">
          {sessions?.map(({ session, sets, exercises, volume, seconds }) => (
            <button
              key={session.id}
              type="button"
              className="list__item"
              onClick={() => navigate(`/historico/${session.id}`)}
            >
              <div className="list__main">
                <div className="list__name">
                  {session.workoutName}
                  {session.finishedAt === undefined && (
                    <span className="chip chip--accent" style={{ marginLeft: 8 }}>
                      em andamento
                    </span>
                  )}
                </div>
                <div className="list__meta">
                  {formatWeekday(session.startedAt)} · {formatDateTime(session.startedAt)}
                </div>
                <div className="list__meta">
                  {sets} séries · {exercises} exercícios
                  {volume > 0 && ` · ${formatNumber(volume, 0)} kg`}
                  {seconds > 0 && ` · ${formatSeconds(seconds)}`}
                </div>
              </div>
              <span className="chevron">›</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
