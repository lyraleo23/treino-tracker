import type { ReactNode } from 'react'

interface Props {
  icon: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div className="empty__title">{title}</div>
      {description && <p style={{ margin: '4px 0 16px' }}>{description}</p>}
      {action}
    </div>
  )
}
