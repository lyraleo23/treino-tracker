import { useEffect, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  /** Rodapé com as ações; se omitido, mostra apenas "Fechar". */
  actions?: ReactNode
}

export function Modal({ title, onClose, children, actions }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        // Só fecha quando o toque foi realmente no fundo, não em um filho.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal">
        <div className="modal__title">{title}</div>
        {children}
        <div className="modal__actions">
          {actions ?? (
            <button type="button" className="btn" onClick={onClose}>
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ConfirmProps {
  title: string
  message: string
  confirmLabel?: string
  /** Onde "Cancelar" não descreve bem a saída ("Continuar treinando"). */
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn btn--danger' : 'btn btn--primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 15 }}>{message}</p>
    </Modal>
  )
}
