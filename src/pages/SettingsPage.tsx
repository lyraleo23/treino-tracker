import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { exportBackup, importBackup, mergeBackup, wipeAll, type ImportMode } from '../db/backup'
import { seedIfEmpty } from '../db/seed'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/Modal'

export function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [includePhotos, setIncludePhotos] = useState(true)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const counts = useLiveQuery(async () => {
    const exercises = await db.exercises.toArray()
    const photoBytes = exercises.reduce((sum, e) => sum + (e.photo?.size ?? 0), 0)
    return {
      exercises: exercises.length,
      photos: exercises.filter((e) => e.photo).length,
      photoBytes,
      workouts: await db.workouts.count(),
      sessions: await db.sessions.count(),
      sets: await db.setLogs.count(),
    }
  })

  async function handleExport() {
    const backup = await exportBackup(includePhotos)
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

  async function handleImport(file: File, importMode: ImportMode) {
    try {
      const raw = await file.text()
      if (importMode === 'merge') {
        await mergeBackup(raw)
        setMessage('Plano atualizado. Seu histórico continua intacto.')
      } else {
        await importBackup(raw)
        setMessage('Backup restaurado.')
      }
      setError(null)
    } catch (cause) {
      setMessage(null)
      setError(cause instanceof Error ? cause.message : 'Falha ao importar o arquivo.')
    }
  }

  function pickFile(importMode: ImportMode) {
    setMode(importMode)
    fileInput.current?.click()
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
          {(counts?.photos ?? 0) > 0 && (
            <label className="row" style={{ gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(event) => setIncludePhotos(event.target.checked)}
              />
              Incluir as {counts?.photos} fotos (~
              {Math.round(((counts?.photoBytes ?? 0) * 1.37) / 1024)} KB a mais)
            </label>
          )}

          <button
            type="button"
            className="btn btn--block"
            onClick={() => pickFile('merge')}
          >
            Importar plano de treino
          </button>
          <p className="hint" style={{ marginTop: -4 }}>
            Atualiza treinos, exercícios e blocos que vierem no arquivo. Seu histórico
            de sessões e pesos é preservado.
          </p>

          <button
            type="button"
            className="btn btn--block btn--ghost"
            onClick={() => pickFile('replace')}
          >
            Restaurar backup completo
          </button>
          <p className="hint" style={{ marginTop: -4 }}>
            Substitui <strong>tudo</strong> pelo conteúdo do arquivo, inclusive o
            histórico. Use só para voltar de um backup.
          </p>

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
          title={mode === 'merge' ? 'Importar plano' : 'Restaurar backup'}
          message={
            mode === 'merge'
              ? `"${pendingFile.name}" vai atualizar os treinos e exercícios que estiverem nele. Nada do seu histórico é apagado.`
              : `"${pendingFile.name}" vai substituir todos os treinos, exercícios e o histórico de sessões.`
          }
          confirmLabel={mode === 'merge' ? 'Importar' : 'Restaurar'}
          danger={mode === 'replace'}
          onCancel={() => setPendingFile(null)}
          onConfirm={async () => {
            const file = pendingFile
            setPendingFile(null)
            await handleImport(file, mode)
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
