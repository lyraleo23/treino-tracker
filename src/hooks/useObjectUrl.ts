import { useEffect, useState } from 'react'

/**
 * URL temporária para exibir um Blob guardado no IndexedDB, revogada quando o
 * componente sai ou o Blob muda — senão a memória vaza a cada re-render.
 */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }

    const created = URL.createObjectURL(blob)
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [blob])

  return url
}
