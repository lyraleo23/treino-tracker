import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { exportBackup, importBackup, wipeAll } from '../db/backup'
import { seedIfEmpty } from '../db/seed'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/Modal'

export function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const counts = useLiveQuery(async () => ({
    exercises: await db.exercises.count(),
    workouts: await db.workouts.count(),
    sessions: await db.sessions.count(),
    sets: await db.setLogs.count(),
  }))

  async function handleExport() {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const date = new Date().toISOString().slice(0, 10)

    const link = document.createElement('a')
    link.href = url
    link.download = `treino-tracker-${date}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setError(null)
    setMessage('Backup gerado. No iPhone ele vai para o app Arquivos.')
  }

  async function handleImport(file: File) {
    try {
      await importBackup(await file.text())
      setError(null)
      setMessage('Backup restaurado.')
    } catch (cause) {
      setMessage(null)
      setError(cause instanceof Error ? cause.message : 'Falha ao importar o arquivo.')
    }
  }

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Backup e dados do app" />

      <div className="page">
        <h2 className="section-title">Dados guardados</h2>
        <div className="stats">
          <div className="stat">
            <div className="stat__value">{counts?.workouts ?? '—'}</div>
            <div className="stat__label">Treinos</div>
          </div>
          <div className="stat">
            <div className="stat__value">{counts?.exercises ?? '—'}</div>
            <div className="stat__label">Exercícios</div>
          </div>
          <div className="stat">
            <div className="stat__value">{counts?.sessions ?? '—'}</div>
            <div className="stat__label">Sessões</div>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          {counts?.sets ?? 0} séries registradas. Tudo fica só neste aparelho — nada é
          enviado para servidor nenhum.
        </p>

        <h2 className="section-title">Backup</h2>
        <div className="stack">
          <button
            type="button"
            className="btn btn--block"
            onClick={() => void handleExport()}
          >
            Exportar backup (JSON)
          </button>
          <button
            type="button"
            className="btn btn--block"
            onClick={() => fileInput.current?.click()}
          >
            Importar backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) setPendingFile(file)
            }}
          />
          <p className="hint">
            Importar substitui todos os dados atuais pelo conteúdo do arquivo. Exporte
            antes de limpar o Safari ou trocar de aparelho.
          </p>
        </div>

        {message && (
          <p style={{ color: 'var(--accent)', fontSize: 14 }}>{message}</p>
        )}
        {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}

        <h2 className="section-title">Zona de risco</h2>
        <div className="stack">
          <button
            type="button"
            className="btn btn--block btn--danger"
            onClick={() => setConfirmWipe(true)}
          >
            Apagar todos os dados
          </button>
        </div>

        <h2 className="section-title">Sobre</h2>
        <p className="hint">
          Treino Tracker · PWA offline. Para instalar no iPhone: abra no Safari, toque em
          Compartilhar e escolha "Adicionar à Tela de Início".
        </p>
      </div>

      {pendingFile && (
        <ConfirmDialog
          title="Importar backup"
          message={`"${pendingFile.name}" vai substituir todos os treinos, exercícios e sessões atuais.`}
          confirmLabel="Importar"
          danger
          onCancel={() => setPendingFile(null)}
          onConfirm={async () => {
            const file = pendingFile
            setPendingFile(null)
            await handleImport(file)
          }}
        />
      )}

      {confirmWipe && (
        <ConfirmDialog
          title="Apagar todos os dados"
          message="Treinos, exercícios e todo o histórico serão apagados. O catálogo padrão será recriado."
          confirmLabel="Apagar tudo"
          danger
          onCancel={() => setConfirmWipe(false)}
          onConfirm={async () => {
            await wipeAll()
            await seedIfEmpty()
            setConfirmWipe(false)
            setError(null)
            setMessage('Dados apagados.')
          }}
        />
      )}
    </>
  )
}
