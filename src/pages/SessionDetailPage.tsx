import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SetBlock, type SetLog } from '../db/db'
import { discardSession, updateSessionNotes } from '../db/actions'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/Modal'
import {
  BLOCK_LABELS,
  formatBlockLabel,
  formatDateTime,
  formatNumber,
  formatSeconds,
  formatWeight,
} from '../lib/format'

interface NotesForm {
  notes: string
  feeling: string
  strongPoints: string
  improvePoints: string
}

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState<NotesForm | null>(null)

  const data = useLiveQuery(async () => {
    if (!sessionId) return null
    const session = await db.sessions.get(sessionId)
    if (!session) return null

    const logs = await db.setLogs.where('sessionId').equals(sessionId).toArray()
    const exerciseIds = [...new Set(logs.map((log) => log.exerciseId))]
    const exercises = await db.exercises.bulkGet(exerciseIds)
    const blocks = await db.setBlocks.bulkGet([
      ...new Set(logs.map((log) => log.blockId).filter(Boolean)),
    ])
    const blockById = new Map(
      blocks.filter((block): block is SetBlock => !!block).map((block) => [block.id, block]),
    )

    const groups = exerciseIds.map((id, index) => {
      const own = logs.filter((log) => log.exerciseId === id)
      const blockIds = [...new Set(own.map((log) => log.blockId))]
      const siblings = blockIds
        .map((blockId) => blockById.get(blockId))
        .filter((block): block is SetBlock => !!block)
        .sort((a, b) => a.order - b.order)

      return {
        name: exercises[index]?.name ?? 'Exercício removido',
        blocks: blockIds
          .map((blockId) => {
            const block = blockById.get(blockId)
            return {
              blockId,
              label: block ? formatBlockLabel(block, siblings) : 'Séries',
              kind: block?.kind ?? 'working',
              order: block?.order ?? 0,
              logs: own
                .filter((log) => log.blockId === blockId)
                .sort((a, b) => a.setIndex - b.setIndex),
            }
          })
          .sort((a, b) => a.order - b.order),
      }
    })

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
        <PageHeader title="Sessão" back backTo="/historico" backLabel="Histórico" />
        <div className="page">
          <EmptyState icon="🤔" title="Sessão não encontrada" />
        </div>
      </>
    )
  }

  if (!data) return <div className="page" />

  const { session, groups, sets, volume, seconds } = data

  const notes: NotesForm = form ?? {
    notes: session.notes ?? '',
    feeling: session.feeling ?? '',
    strongPoints: session.strongPoints ?? '',
    improvePoints: session.improvePoints ?? '',
  }

  const patchNotes = (patch: Partial<NotesForm>) =>
    setForm({ ...notes, ...patch })

  const saveNotes = () => void updateSessionNotes(session.id, notes)

  const describe = (log: SetLog) => {
    if (log.seconds !== undefined) {
      return log.weight
        ? `${formatWeight(log.weight)} · ${formatSeconds(log.seconds)}`
        : formatSeconds(log.seconds)
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
        backLabel="Histórico"
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
              {group.blocks.map((block) => (
                <div key={block.blockId} className={`block block--${block.kind}`}>
                  <div className="block__title">
                    {block.label || BLOCK_LABELS.working}
                  </div>
                  <table className="table">
                    <tbody>
                      {block.logs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            {log.setIndex + 1}
                            {log.note && <div className="block__hint">{log.note}</div>}
                          </td>
                          <td>{describe(log)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        ))}

        <h2 className="section-title">Notas do treino</h2>
        <div className="stack">
          <div className="field">
            <label className="field__label" htmlFor="session-feeling">
              Sensação geral
            </label>
            <input
              id="session-feeling"
              className="input"
              value={notes.feeling}
              placeholder="Forte, cansado, sem energia..."
              onChange={(event) => patchNotes({ feeling: event.target.value })}
              onBlur={saveNotes}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="session-strong">
              Pontos fortes
            </label>
            <input
              id="session-strong"
              className="input"
              value={notes.strongPoints}
              onChange={(event) => patchNotes({ strongPoints: event.target.value })}
              onBlur={saveNotes}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="session-improve">
              Pontos a melhorar
            </label>
            <input
              id="session-improve"
              className="input"
              value={notes.improvePoints}
              onChange={(event) => patchNotes({ improvePoints: event.target.value })}
              onBlur={saveNotes}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="session-notes">
              Observações gerais
            </label>
            <textarea
              id="session-notes"
              className="textarea"
              value={notes.notes}
              placeholder="Como foi o treino?"
              onChange={(event) => patchNotes({ notes: event.target.value })}
              onBlur={saveNotes}
            />
          </div>
        </div>

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
