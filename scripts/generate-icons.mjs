import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve('public')

// The shelf-label world, as a tear-off calendar: a tag-red header carrying the
// name, and the days below with a few of them marked — which is what the
// availability tab is for. No gradient and no radius; both belonged to the
// palette this replaced.
const TAG = '#c42d12' // the tag red, carries the label stock at 5.35:1
const PAPER = '#fbf9f3' // the label face
const SOFT = '#d6cfbc' // an unmarked day

// Archivo is the one face this product owns. Install the matching static
// instance before running this, or the renderer falls back to a system sans
// and the icon quietly stops being ours:
//   curl -sA Mozilla/5.0 "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@68,800"
//   # fetch the extra-condensed src into ~/.local/share/fonts, then fc-cache -f
const FACE = "'Archivo ExtraCondensed', 'Archivo', sans-serif"

// Marked days on the 4×3 grid, by index:
//   0  1  2  3
//   4  5  6  7
//   8  9 10 11
// Chosen so no two share a row, a column or an edge — people mark the days they
// can, and a tidy diagonal would read as a drawn figure instead of a calendar.
const MARKED = [2, 4, 11]

function iconSvg({ size, padding = 0 }) {
  const safe = size - padding * 2
  const k = safe / 512
  const o = padding

  // Below this the name is unreadable and a 4×3 grid turns to mush, so the mark
  // simplifies: the header keeps its band without the word, and the days become
  // four large squares. Same mark, drawn for the size it is seen at.
  const full = safe >= 128

  const headH = (full ? 140 : 150) * k
  const cols = full ? 4 : 2
  const rows = full ? 3 : 2
  // On the 2×2 fallback a single mark is the only arrangement that forms no
  // figure at all: any pair of four cells is either an edge or a diagonal.
  const marked = full ? MARKED : [1]
  const pad = (full ? 70 : 96) * k
  const gap = (full ? 22 : 34) * k
  const top = o + (full ? 200 : 230) * k
  const cell = (safe - pad * 2 - gap * (cols - 1)) / cols

  let days = ''
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      days += `<rect x="${o + pad + c * (cell + gap)}" y="${top + r * (cell + gap)}" width="${cell}" height="${cell}" fill="${marked.includes(i) ? TAG : SOFT}"/>`
    }
  }

  const name = full
    ? `<text x="${o + safe / 2}" y="${o + 101 * k}" text-anchor="middle" font-family="${FACE}" font-weight="800" font-size="${86 * k}" letter-spacing="${10 * k}" fill="${PAPER}">EVENTSPLIT</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PAPER}"/>
  <rect x="${o}" y="${o}" width="${safe}" height="${headH}" fill="${TAG}"/>
  ${name}
  ${days}
</svg>`
}

const outputs = [
  { name: 'icon-192.png', size: 192, svg: iconSvg({ size: 192 }) },
  { name: 'icon-512.png', size: 512, svg: iconSvg({ size: 512 }) },
  {
    name: 'icon-maskable-512.png',
    size: 512,
    svg: iconSvg({ size: 512, padding: 512 * 0.14 }),
  },
  { name: 'apple-touch-icon.png', size: 180, svg: iconSvg({ size: 180 }) },
]

for (const out of outputs) {
  const png = await sharp(Buffer.from(out.svg)).png().toBuffer()
  writeFileSync(resolve(OUT, out.name), png)
  console.log(`wrote ${out.name} (${out.size}×${out.size})`)
}

const favSizes = [16, 32, 48]
const favBuffers = await Promise.all(
  favSizes.map((sz) => sharp(Buffer.from(iconSvg({ size: sz }))).png().toBuffer()),
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

writeFileSync(resolve(OUT, 'favicon.ico'), buildIco(favBuffers, favSizes))
console.log('wrote favicon.ico (16+32+48 multi-size)')
