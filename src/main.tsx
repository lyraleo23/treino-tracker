import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { seedIfEmpty } from './db/seed'
import './styles/global.css'

void seedIfEmpty()

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
