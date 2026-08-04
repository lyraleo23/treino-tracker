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
  action?: ReactNode
}

export function PageHeader({ title, subtitle, back, backTo, action }: Props) {
  const navigate = useNavigate()

  return (
    <header className={back ? 'header header--bordered' : 'header'}>
      {back && (
        <button
          type="button"
          className="btn btn--icon btn--ghost"
          aria-label="Voltar"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        >
          <ChevronLeftIcon />
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
