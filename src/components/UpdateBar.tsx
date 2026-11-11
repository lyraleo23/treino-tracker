import { useMatch } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** De quanto em quanto tempo um app deixado aberto procura versão nova. */
const CHECK_INTERVAL = 60 * 60 * 1000

/**
 * Procura versão nova de hora em hora e sempre que o app volta para a frente.
 * O navegador só faz isso sozinho ao abrir uma página, e no iPhone o app
 * instalado fica dias suspenso sem nunca ser aberto do zero.
 */
function watchForUpdates(registration: ServiceWorkerRegistration) {
  const check = () => {
    if (registration.installing || !navigator.onLine) return
    registration.update().catch(() => {})
  }
  setInterval(check, CHECK_INTERVAL)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
}

/**
 * Avisa que há versão nova e só troca quando a pessoa pede. Trocar sozinho
 * recarregaria a página no meio de um treino, e o que foi digitado numa série
 * ainda não concluída se perderia.
 */
export function UpdateBar() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) watchForUpdates(registration)
    },
  })

  // A sessão não tem barra de abas: lá o aviso desce até o rodapé.
  const inSession = useMatch('/sessao/:sessionId') !== null

  if (!needRefresh) return null

  return (
    <div
      className={inSession ? 'update-bar' : 'update-bar update-bar--above-tabs'}
      role="status"
    >
      <span className="update-bar__text">Nova versão disponível.</span>
      <button
        type="button"
        className="btn btn--sm btn--ghost"
        onClick={() => setNeedRefresh(false)}
      >
        Agora não
      </button>
      <button
        type="button"
        className="btn btn--sm btn--primary"
        onClick={(event) => {
          // A troca leva um instante e termina recarregando a página; o botão
          // travado evita um segundo toque nesse meio-tempo.
          event.currentTarget.disabled = true
          event.currentTarget.textContent = 'Atualizando…'
          void updateServiceWorker()
        }}
      >
        Atualizar
      </button>
    </div>
  )
}
