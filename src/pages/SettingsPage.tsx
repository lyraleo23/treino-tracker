import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_LADDER_RATIOS } from '../db/db'
import { exportBackup, importBackup, mergeBackup, wipeAll, type ImportMode } from '../db/backup'
import { saveLadderRatios } from '../db/actions'
import { getLadderRatios } from '../db/queries'
import { seedIfEmpty } from '../db/seed'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/Modal'
import { parseNumber } from '../lib/format'

/** Os três percentuais da escada, na ordem em que se lê a progressão. */
const LADDER_FIELDS = [
  { key: 'warmup', label: 'Aquecimento' },
  { key: 'feederMin', label: 'Feeder mín.' },
  { key: 'feederMax', label: 'Feeder máx.' },
] as const

type LadderForm = Record<(typeof LADDER_FIELDS)[number]['key'], string>

export function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [includePhotos, setIncludePhotos] = useState(true)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  /** `null` espelha o banco; preenchido, é o que está sendo editado. */
  const [ladderForm, setLadderForm] = useState<LadderForm | null>(null)

  const savedRatios = useLiveQuery(getLadderRatios, [])

  // A razão é guardada como 0,85; a tela fala em 85%. A conversão vive só aqui.
  const toPercent = (value: number) => String(Math.round(value * 1000) / 10)

  const ladder: LadderForm = ladderForm ?? {
    warmup: toPercent(savedRatios?.warmup ?? DEFAULT_LADDER_RATIOS.warmup),
    feederMin: toPercent(savedRatios?.feederMin ?? DEFAULT_LADDER_RATIOS.feederMin),
    feederMax: toPercent(savedRatios?.feederMax ?? DEFAULT_LADDER_RATIOS.feederMax),
  }

  const parsedLadder = {
    warmup: parseNumber(ladder.warmup),
    feederMin: parseNumber(ladder.feederMin),
    feederMax: parseNumber(ladder.feederMax),
  }

  const naFaixa = Object.values(parsedLadder).every(
    (value) => value !== undefined && value >= 1 && value <= 99,
  )

  const ladderError = !naFaixa
    ? 'Cada percentual precisa ficar entre 1% e 99%. Feeder em 100% alcançaria o working set.'
    : parsedLadder.feederMin! > parsedLadder.feederMax!
      ? 'O feeder mínimo não pode passar do máximo — a escada andaria para trás.'
      : null

  // Aquecimento acima do feeder é esquisito, mas nada no app se apoia nele.
  const ladderWarning =
    !ladderError && parsedLadder.warmup! > parsedLadder.feederMin!
      ? 'O aquecimento está mais pesado que o feeder mínimo. Nada quebra, mas a escada fica ao contrário.'
      : null

  async function handleSaveRatios() {
    if (ladderError) return
    await saveLadderRatios({
      warmup: parsedLadder.warmup! / 100,
      feederMin: parsedLadder.feederMin! / 100,
      feederMax: parsedLadder.feederMax! / 100,
    })
    setLadderForm(null)
    setMessage('Distribuição de carga salva.')
  }

  async function handleResetRatios() {
    await saveLadderRatios(DEFAULT_LADDER_RATIOS)
    setLadderForm(null)
    setMessage('Distribuição de carga de volta ao padrão.')
  }

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

        <h2 className="section-title">Distribuição de carga</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Percentuais do working set usados na sugestão de carga. Com vários feeders,
          eles são distribuídos em passos iguais entre o mínimo e o máximo.
        </p>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
        >
          {LADDER_FIELDS.map(({ key, label }) => (
            <div className="field" key={key}>
              <label className="field__label" htmlFor={`ladder-${key}`}>
                {label}
              </label>
              <input
                id={`ladder-${key}`}
                className="input input--center"
                inputMode="decimal"
                value={ladder[key]}
                onChange={(event) =>
                  setLadderForm({ ...ladder, [key]: event.target.value })
                }
              />
            </div>
          ))}
        </div>

        <p className="hint">
          {ladderError ??
            `Com working a 100 kg e 2 feeders: aquecimento ${ladder.warmup}% · feeders ${ladder.feederMin}% e ${ladder.feederMax}% · working 100%.`}
        </p>
        {ladderWarning && (
          <p className="hint" style={{ color: 'var(--warn)' }}>
            {ladderWarning}
          </p>
        )}

        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn--primary"
            style={{ flex: 1 }}
            disabled={!!ladderError}
            onClick={() => void handleSaveRatios()}
          >
            Salvar
          </button>
          <button type="button" className="btn" onClick={() => void handleResetRatios()}>
            Voltar ao padrão
          </button>
        </div>

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
