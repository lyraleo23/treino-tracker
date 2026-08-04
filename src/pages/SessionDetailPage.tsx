import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SetLog } from '../db/db'
import { discardSession, updateSessionNotes } from '../db/actions'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/Modal'
import { formatDateTime, formatNumber, formatSeconds, formatWeight } from '../lib/format'

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [notes, setNotes] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    if (!sessionId) return null
    const session = await db.sessions.get(sessionId)
    if (!session) return null

    const logs = await db.setLogs.where('sessionId').equals(sessionId).toArray()
    const exerciseIds = [...new Set(logs.map((log) => log.exerciseId))]
    const exercises = await db.exercises.bulkGet(exerciseIds)

    const groups = exerciseIds.map((id, index) => ({
      name: exercises[index]?.name ?? 'Exercício removido',
      logs: logs
        .filter((log) => log.exerciseId === id)
        .sort((a, b) => a.setIndex - b.setIndex),
    }))

    return {
      session,
      groups,
      sets: logs.length,
      volume: logs.reduce((sum, log) => sum + (log.weight ?? 0) * (log.reps ?? 0), 0),
      seconds: logs.reduce((sum, log) => sum + (log.seconds ?? 0), 0),
    }
  }, [sessionId])

  if (data === null) {
    return (
      <>
        <PageHeader title="Sessão" back backTo="/historico" />
        <div className="page">
          <EmptyState icon="🤔" title="Sessão não encontrada" />
        </div>
      </>
    )
  }

  if (!data) return <div className="page" />

  const { session, groups, sets, volume, seconds } = data
  const notesValue = notes ?? session.notes ?? ''

  const describe = (log: SetLog) => {
    if (log.seconds !== undefined) {
      return log.weight ? `${formatWeight(log.weight)} · ${formatSeconds(log.seconds)}` : formatSeconds(log.seconds)
    }
    return `${formatWeight(log.weight)} × ${log.reps ?? '—'}`
  }

  return (
    <>
      <PageHeader
        title={session.workoutName}
        subtitle={formatDateTime(session.startedAt)}
        back
        backTo="/historico"
      />

      <div className="page">
        <div className="stats">
          <div className="stat">
            <div className="stat__value">{sets}</div>
            <div className="stat__label">Séries</div>
          </div>
          <div className="stat">
            <div className="stat__value">{formatNumber(volume, 0)}</div>
            <div className="stat__label">Volume kg</div>
          </div>
          <div className="stat">
            <div className="stat__value">
              {seconds > 0 ? formatSeconds(seconds) : groups.length}
            </div>
            <div className="stat__label">{seconds > 0 ? 'Tempo' : 'Exercícios'}</div>
          </div>
        </div>

        {groups.length === 0 && (
          <EmptyState icon="📭" title="Nada registrado nesta sessão" />
        )}

        {groups.map((group) => (
          <section key={group.name}>
            <h2 className="section-title">{group.name}</h2>
            <div className="card card--tight">
              <table className="table">
                <thead>
                  <tr>
                    <th>Série</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {group.logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.setIndex + 1}</td>
                      <td>{describe(log)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <h2 className="section-title">Observações</h2>
        <textarea
          className="textarea"
          value={notesValue}
          placeholder="Como foi o treino?"
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => void updateSessionNotes(session.id, notesValue)}
        />

        <div className="stack" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn btn--block btn--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Excluir sessão
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir sessão"
          message="Todos os registros desta sessão serão apagados do histórico."
          confirmLabel="Excluir"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await discardSession(session.id)
            navigate('/historico', { replace: true })
          }}
        />
      )}
    </>
  )
}
