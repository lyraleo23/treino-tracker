import { NavLink, Outlet } from 'react-router-dom'
import {
  DropIcon,
  DumbbellIcon,
  HistoryIcon,
  ListIcon,
  SettingsIcon,
  TrophyIcon,
} from './icons'

// Seis abas: a 375px cada uma fica com ~62px, e "Exercícios" é o rótulo mais
// largo que ainda cabe — o CSS da .tab encolhe a letra em telas mais estreitas.
// Uma sétima não cabe: Nutrição divide a aba "Saúde" com Hidratação em vez de
// virar item próprio.
const TABS = [
  { to: '/', label: 'Treinos', Icon: DumbbellIcon },
  { to: '/historico', label: 'Histórico', Icon: HistoryIcon },
  { to: '/exercicios', label: 'Exercícios', Icon: ListIcon },
  { to: '/arena', label: 'Arena', Icon: TrophyIcon },
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
