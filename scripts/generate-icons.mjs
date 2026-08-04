// Gera os PNGs do PWA sem depender de biblioteca de imagem: desenha o halter
// em um buffer RGBA e escreve o PNG na mão (zlib do próprio Node).
// Uso: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = [52, 211, 153, 255] // --accent
const INK = [8, 24, 18, 255] // verde bem escuro, contraste alto sobre o fundo

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, pixels) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filtro "None"
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Retângulo de cantos arredondados em coordenadas normalizadas (0–1). */
function roundedRect(pixels, size, x0, y0, x1, y1, radius, color) {
  const left = Math.round(x0 * size)
  const top = Math.round(y0 * size)
  const right = Math.round(x1 * size)
  const bottom = Math.round(y1 * size)
  const r = radius * size

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const dx = Math.max(left + r - x - 0.5, x + 0.5 - (right - r), 0)
      const dy = Math.max(top + r - y - 0.5, y + 0.5 - (bottom - r), 0)
      if (dx * dx + dy * dy > r * r) continue

      const offset = (y * size + x) * 4
      pixels[offset] = color[0]
      pixels[offset + 1] = color[1]
      pixels[offset + 2] = color[2]
      pixels[offset + 3] = color[3]
    }
  }
}

function drawIcon(size, scale) {
  const pixels = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 4] = BG[0]
    pixels[i * 4 + 1] = BG[1]
    pixels[i * 4 + 2] = BG[2]
    pixels[i * 4 + 3] = BG[3]
  }

  // Halter centrado: barra + par de anilhas de cada lado.
  const s = (value) => 0.5 + (value - 0.5) * scale
  const bars = [
    [0.3, 0.455, 0.7, 0.545, 0.02], // barra
    [0.235, 0.34, 0.325, 0.66, 0.035], // anilha interna esquerda
    [0.675, 0.34, 0.765, 0.66, 0.035], // anilha interna direita
    [0.15, 0.4, 0.225, 0.6, 0.03], // anilha externa esquerda
    [0.775, 0.4, 0.85, 0.6, 0.03], // anilha externa direita
  ]

  for (const [x0, y0, x1, y1, radius] of bars) {
    roundedRect(pixels, size, s(x0), s(y0), s(x1), s(y1), radius * scale, INK)
  }

  return encodePng(size, size, pixels)
}

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  ['pwa-192.png', 192, 1],
  ['pwa-512.png', 512, 1],
  // Maskable: conteúdo dentro da zona segura (80% do lado).
  ['pwa-512-maskable.png', 512, 0.72],
  ['apple-touch-icon.png', 180, 1],
]

for (const [name, size, scale] of targets) {
  writeFileSync(join(OUT_DIR, name), drawIcon(size, scale))
  console.log(`✓ ${name} (${size}px)`)
}
