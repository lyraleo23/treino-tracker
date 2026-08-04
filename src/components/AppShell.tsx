import { NavLink, Outlet } from 'react-router-dom'
import { DumbbellIcon, HistoryIcon, ListIcon, SettingsIcon } from './icons'

const TABS = [
  { to: '/', label: 'Treinos', Icon: DumbbellIcon },
  { to: '/historico', label: 'Histórico', Icon: HistoryIcon },
  { to: '/exercicios', label: 'Exercícios', Icon: ListIcon },
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
