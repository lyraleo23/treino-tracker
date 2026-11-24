import { useSyncExternalStore } from 'react'

/**
 * Temas visuais. Cada um é só um bloco de tokens no CSS (`[data-theme=...]` em
 * styles/global.css); aqui ficam o nome, a descrição e a cor da barra do
 * navegador, que o CSS não alcança.
 *
 * O tema é preferência do aparelho, não dado de treino: fica no localStorage,
 * fora do backup. E precisa ser lido de forma síncrona — o script no
 * index.html aplica antes da primeira pintura, senão a tela piscaria no tema
 * padrão a cada abertura. O IndexedDB só responderia depois.
 */
export const THEMES = [
  {
    id: 'padrao',
    name: 'Padrão',
    description: 'Grafite com verde',
    /** Mesma cor do `--bg` do tema. */
    themeColor: '#0d0f13',
  },
  {
    id: 'gta6',
    name: 'GTA VI',
    description: 'Pôr do sol neon em Leonida',
    themeColor: '#140a22',
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'padrao'

/** A chave também está escrita no script do index.html — mudar nos dois. */
const STORAGE_KEY = 'treino-tracker:theme'

function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}

/** Navegação privada e dados bloqueados fazem o localStorage lançar erro. */
function readStored(): ThemeId {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isThemeId(value) ? value : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

let current: ThemeId = readStored()
const listeners = new Set<() => void>()

/** Põe o tema no `<html>` e acerta a cor da barra do navegador. */
export function applyTheme(id: ThemeId = current) {
  document.documentElement.dataset.theme = id
  const color = THEMES.find((theme) => theme.id === id)?.themeColor
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta && color) meta.content = color
}

export function setTheme(id: ThemeId) {
  if (id === current) return
  current = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Sem armazenamento o tema vale até fechar o app — melhor que não trocar.
  }
  applyTheme(id)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(subscribe, () => current)
}

/**
 * Lê tokens do tema ativo. Para quem não pode usar `var()` — atributos de SVG
 * no Chrome, por exemplo. Passe o tema de `useTheme` como dependência para
 * reler quando ele mudar.
 */
export function readThemeTokens<const K extends string>(names: readonly K[]): Record<K, string> {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(
    names.map((name) => [name, style.getPropertyValue(`--${name}`).trim()]),
  ) as Record<K, string>
}
