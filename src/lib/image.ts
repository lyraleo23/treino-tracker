const MAX_SIDE = 800
const QUALITY = 0.8

/**
 * Redimensiona a foto escolhida antes de guardar: uma imagem de câmera tem
 * vários MB, e o que o app precisa é de uma referência visual de dezenas de KB.
 */
export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível processar a imagem.')
  context.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  )
  if (!blob) throw new Error('Não foi possível processar a imagem.')
  return blob
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Arquivo não é uma imagem válida.'))
    }
    image.src = url
  })
}

/** Só http(s): impede um `javascript:` colado no campo de vídeo. */
export function isSafeUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function openExternal(url: string): void {
  if (!isSafeUrl(url)) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Blob → data URL, para a foto caber no backup em JSON. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler a imagem.'))
    reader.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return await (await fetch(dataUrl)).blob()
}
