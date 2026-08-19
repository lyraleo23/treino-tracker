import { NavLink, Outlet } from 'react-router-dom'
import { DropIcon, DumbbellIcon, HistoryIcon, ListIcon, SettingsIcon } from './icons'

// Cinco abas cabem a 375px (~75px cada). Uma sexta apertaria para ~62px, que é
// onde os rótulos começam a quebrar — por isso Nutrição divide a aba "Saúde"
// com Hidratação em vez de virar item próprio.
const TABS = [
  { to: '/', label: 'Treinos', Icon: DumbbellIcon },
  { to: '/historico', label: 'Histórico', Icon: HistoryIcon },
  { to: '/exercicios', label: 'Exercícios', Icon: ListIcon },
  { to: '/saude', label: 'Saúde', Icon: DropIcon },
  { to: '/ajustes', label: 'Ajustes', Icon: SettingsIcon },
]

export function AppShell() {
  return (
    <div className="app">
      <Outlet />
      <nav className="tabbar">
        <div className="tabbar__inner">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => (isActive ? 'tab is-active' : 'tab')}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
