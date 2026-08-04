import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// O GitHub Pages serve o app em https://<usuario>.github.io/<repo>/,
// então o build precisa de base. Em dev fica na raiz.
const REPO = 'treino-tracker'

export default defineConfig(({ command, isPreview }) => ({
  // O preview também precisa do base, senão testa uma configuração diferente
  // da que vai para o ar. Só o dev server fica na raiz.
  base: command === 'build' || isPreview ? `/${REPO}/` : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '.',
        name: 'Treino Tracker',
        short_name: 'Treino',
        description: 'Gerenciador de treinos de academia com histórico de carga.',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0e1013',
        theme_color: '#0e1013',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
}))
