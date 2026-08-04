import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from './icons'

interface Props {
  title: string
  subtitle?: string
  /** Mostra o botão de voltar. */
  back?: boolean
  /** Rota específica para o voltar; por padrão volta no histórico. */
  backTo?: string
  /** Texto ao lado da seta: um ícone sozinho não deixa claro que dá para sair. */
  backLabel?: string
  /** Substitui a navegação padrão do voltar, para quem precisa limpar algo antes. */
  onBack?: () => void
  action?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  back,
  backTo,
  backLabel,
  onBack,
  action,
}: Props) {
  const navigate = useNavigate()

  return (
    <header className={back ? 'header header--bordered' : 'header'}>
      {back && (
        <button
          type="button"
          className={backLabel ? 'btn btn--sm btn--ghost back-btn' : 'btn btn--icon btn--ghost'}
          aria-label={backLabel ? `Voltar para ${backLabel}` : 'Voltar'}
          onClick={() => {
            if (onBack) onBack()
            else if (backTo) navigate(backTo)
            else navigate(-1)
          }}
        >
          <ChevronLeftIcon />
          {backLabel}
        </button>
      )}
      <div className="header__titles">
        <h1>{title}</h1>
        {subtitle && <div className="header__sub">{subtitle}</div>}
      </div>
      {action}
    </header>
  )
}
