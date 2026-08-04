import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { WorkoutsPage } from './pages/WorkoutsPage'
import { WorkoutEditPage } from './pages/WorkoutEditPage'
import { SessionPage } from './pages/SessionPage'
import { HistoryPage } from './pages/HistoryPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { ExercisesPage } from './pages/ExercisesPage'
import { SettingsPage } from './pages/SettingsPage'

// A biblioteca de gráficos responde por metade do bundle e só é usada aqui,
// então vira um chunk separado carregado sob demanda.
const ExerciseHistoryPage = lazy(() =>
  import('./pages/ExerciseHistoryPage').then((module) => ({
    default: module.ExerciseHistoryPage,
  })),
)

/**
 * HashRouter em vez de BrowserRouter: o GitHub Pages não reescreve rotas para
 * o index.html, então qualquer link direto daria 404 com paths reais.
 */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<WorkoutsPage />} />
          <Route path="/treinos/:workoutId" element={<WorkoutEditPage />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="/historico/:sessionId" element={<SessionDetailPage />} />
          <Route path="/exercicios" element={<ExercisesPage />} />
          <Route
            path="/exercicios/:exerciseId"
            element={
              <Suspense fallback={<div className="page" />}>
                <ExerciseHistoryPage />
              </Suspense>
            }
          />
          <Route path="/ajustes" element={<SettingsPage />} />
        </Route>
        {/* A sessão ocupa a tela inteira: sem a barra de abas para não distrair. */}
        <Route path="/sessao/:sessionId" element={<SessionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
