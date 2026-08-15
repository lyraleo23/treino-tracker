import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Cycle, type Program } from '../db/db'
import {
  activateProgram,
  createProgram,
  deleteProgram,
  duplicateProgram,
  updateProgram,
} from '../db/actions'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/Modal'
import { ProgramFormModal } from '../components/ProgramFormModal'
import { PlusIcon } from '../components/icons'
import { formatCycle, formatDate } from '../lib/format'

interface ProgramCard {
  program: Program
  workouts: number
  cycleDone: number
  lastSession?: number
}

export function ProgramsPage() {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [duplicating, setDuplicating] = useState<Program | null>(null)
  const [removing, setRemoving] = useState<Program | null>(null)

  const cards = useLiveQuery(async () => {
    const programs = await db.programs.orderBy('order').toArray()
    const workouts = await db.workouts.toArray()
    const sessions = await db.sessions.toArray()

    const rows: ProgramCard[] = programs.map((program) => {
      const ids = new Set(
        workouts.filter((w) => w.programId === program.id).map((w) => w.id),
      )
      const finished = sessions.filter(
        (s) => ids.has(s.workoutId) && s.finishedAt !== undefined,
      )
      const cycleStart = program.cycleStartedAt ?? 0

      return {
        program,
        workouts: ids.size,
        // O ciclo do programa soma as sessões de todos os treinos dele.
        cycleDone: finished.filter((s) => s.startedAt >= cycleStart).length,
        lastSession:
          finished.length > 0 ? Math.max(...finished.map((s) => s.finishedAt!)) : undefined,
      }
    })

    // O ativo primeiro; o resto na ordem de criação.
    return rows.sort((a, b) => a.program.archived - b.program.archived)
  }, [])

  const total = cards?.length ?? 0

  async function handleCreate(name: string, cycle?: Cycle) {
    await createProgram(name, cycle)
    setCreating(false)
  }

  return (
    <>
      <PageHeader
        title="Programas"
        subtitle="Cada bateria de treinos, com sua validade"
        back
        backTo="/"
        backLabel="Treinos"
        action={
          <button
            type="button"
            className="btn btn--icon btn--primary"
            aria-label="Novo programa"
            onClick={() => setCreating(true)}
          >
            <PlusIcon />
          </button>
        }
      />

      <div className="page">
        <div className="stack">
          {cards?.map(({ program, workouts, cycleDone, lastSession }) => {
            const cycle = formatCycle(program.cycle, cycleDone)
            const active = program.archived === 0

            return (
              <div key={program.id} className="card">
                <div className="row row--between">
                  <div style={{ minWidth: 0 }}>
                    <div className="card__title">{program.name}</div>
                    <div className="card__meta">
                      {workouts} {workouts === 1 ? 'treino' : 'treinos'}
                      {lastSession
                        ? ` · última: ${formatDate(lastSession)}`
                        : ' · nunca usado'}
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 6 }}>
                      <span className={active ? 'chip chip--accent' : 'chip'}>
                        {active ? 'ativo' : 'arquivado'}
                      </span>
                      {cycle && (
                        <span className={cycle.expired ? 'chip chip--warn' : 'chip'}>
                          {cycle.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="row" style={{ marginTop: 12, flexWrap: 'wrap', gap: 6 }}>
                  {!active && (
                    <button
                      type="button"
                      className="btn btn--sm btn--primary"
                      style={{ flex: 1 }}
                      onClick={() => void activateProgram(program.id)}
                    >
                      Ativar
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => setEditing(program)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => setDuplicating(program)}
                  >
                    Duplicar
                  </button>
                  {!active && total > 1 && (
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => setRemoving(program)}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="hint" style={{ marginTop: 14 }}>
          Arquivar não apaga nada: o plano continua inteiro e o histórico das sessões
          nunca é afetado.
        </p>
      </div>

      {creating && (
        <ProgramFormModal
          onClose={() => setCreating(false)}
          onSave={({ name, cycle }) => void handleCreate(name, cycle)}
        />
      )}

      {editing && (
        <ProgramFormModal
          program={editing}
          onClose={() => setEditing(null)}
          onSave={async ({ name, cycle }) => {
            await updateProgram(editing.id, { name, cycle })
            setEditing(null)
          }}
        />
      )}

      {duplicating && (
        <ProgramFormModal
          program={{ ...duplicating, name: `${duplicating.name} (cópia)` }}
          title="Duplicar programa"
          confirmLabel="Duplicar"
          onClose={() => setDuplicating(null)}
          onSave={async ({ name, cycle }) => {
            const id = await duplicateProgram(duplicating.id, name)
            await updateProgram(id, { name, cycle })
            setDuplicating(null)
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Excluir programa"
          message={`Os treinos de "${removing.name}" serão apagados junto. As sessões já registradas continuam no histórico.`}
          confirmLabel="Excluir"
          danger
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            await deleteProgram(removing.id)
            setRemoving(null)
          }}
        />
      )}
    </>
  )
}
