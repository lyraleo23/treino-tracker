import { useEffect } from 'react'

/**
 * Quantos travamentos estão de pé. Um modal pode abrir outro por cima (o
 * "Criar novo" do seletor de exercícios), e só o último a fechar devolve a
 * rolagem à página.
 */
let locks = 0

/**
 * Trava a rolagem da página enquanto o componente está montado. No iPhone, o
 * arrasto sobre um modal escapava para a página de trás: ela rolava e o modal
 * não, sem jeito de chegar aos botões do fim. Com a página travada, o miolo do
 * modal é a única coisa que pode rolar.
 */
export function useScrollLock(): void {
  useEffect(() => {
    const root = document.documentElement
    if (locks++ === 0) root.classList.add('is-scroll-locked')
    return () => {
      if (--locks === 0) root.classList.remove('is-scroll-locked')
    }
  }, [])
}
