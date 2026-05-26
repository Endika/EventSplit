import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve('public')

const BG_DARK = '#0f172a' // slate-900
const GRAD_FROM = '#a78bfa' // violet-400
const GRAD_TO = '#5eead4' // teal-300

function monogramSvg({ size, padding = 0, rounded = true }) {
  const radius = rounded ? size * 0.22 : 0
  const cx = size / 2
  const cy = size / 2

  const safe = size - padding * 2
  const scale = safe / 512

  const fontSize = 320 * scale
  const baselineOffset = 110 * scale

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="letters" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${GRAD_FROM}"/>
      <stop offset="100%" stop-color="${GRAD_TO}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG_DARK}"/>
  <text
    x="${cx}"
    y="${cy + baselineOffset}"
    text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    letter-spacing="${-12 * scale}"
    fill="url(#letters)">ES</text>
</svg>`
}

const outputs = [
  { name: 'icon-192.png', size: 192, svg: monogramSvg({ size: 192 }) },
  { name: 'icon-512.png', size: 512, svg: monogramSvg({ size: 512 }) },
  {
    name: 'icon-maskable-512.png',
    size: 512,
    svg: monogramSvg({ size: 512, padding: 512 * 0.1, rounded: false }),
  },
  { name: 'apple-touch-icon.png', size: 180, svg: monogramSvg({ size: 180 }) },
]

for (const out of outputs) {
  const png = await sharp(Buffer.from(out.svg)).png().toBuffer()
  writeFileSync(resolve(OUT, out.name), png)
  console.log(`wrote ${out.name} (${out.size}×${out.size})`)
}

const favBuffers = await Promise.all(
  [16, 32, 48].map((sz) => sharp(Buffer.from(monogramSvg({ size: sz }))).png().toBuffer()),
)

function buildIco(pngs, sizes) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const entries = []
  let offset = 6 + pngs.length * 16
  for (let i = 0; i < pngs.length; i++) {
    const e = Buffer.alloc(16)
    const sz = sizes[i] === 256 ? 0 : sizes[i]
    e.writeUInt8(sz, 0)
    e.writeUInt8(sz, 1)
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(pngs[i].length, 8)
    e.writeUInt32LE(offset, 12)
    offset += pngs[i].length
    entries.push(e)
  }
  return Buffer.concat([header, ...entries, ...pngs])
}

writeFileSync(resolve(OUT, 'favicon.ico'), buildIco(favBuffers, [16, 32, 48]))
console.log('wrote favicon.ico (16+32+48 multi-size)')
