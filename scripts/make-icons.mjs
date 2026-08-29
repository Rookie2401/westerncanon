// Generates the app icons as PNGs with no external image library.
// Pure Node: zlib for IDAT, hand-rolled CRC32 + PNG chunking.
// Design: warm paper ground, an accent frame, a centred ink Latin cross —
// a quiet "sacred text" mark that reads cleanly at home-screen size.
//
// Run: node scripts/make-icons.mjs [outDir ...]   (defaults to ./public)
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'latin1')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(size, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  const stride = size * 3
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function render(size) {
  const paper = [0xef, 0xe6, 0xd2]
  const ink = [0x33, 0x2c, 0x22]
  const accent = [0x6b, 0x4f, 0x2a]
  const rgb = Buffer.alloc(size * size * 3)
  const put = (x, y, c) => {
    const i = (y * size + x) * 3
    rgb[i] = c[0]
    rgb[i + 1] = c[1]
    rgb[i + 2] = c[2]
  }

  const margin = size * 0.085
  const frame = size * 0.05
  const cx = size / 2
  const vW = size * 0.125
  const vTop = size * 0.19
  const vBot = size * 0.81
  const hH = size * 0.125
  const hTop = size * 0.35
  const hLeft = size * 0.30
  const hRight = size * 0.70

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = paper
      const inFrameBand =
        x >= margin &&
        x < size - margin &&
        y >= margin &&
        y < size - margin &&
        (x < margin + frame ||
          x >= size - margin - frame ||
          y < margin + frame ||
          y >= size - margin - frame)
      if (inFrameBand) c = accent
      const inCross =
        (x >= cx - vW / 2 && x < cx + vW / 2 && y >= vTop && y < vBot) ||
        (y >= hTop && y < hTop + hH && x >= hLeft && x < hRight)
      if (inCross) c = ink
      put(x, y, c)
    }
  }
  return rgb
}

const outDirs = process.argv.slice(2)
if (outDirs.length === 0) outDirs.push(path.resolve('public'))

const targets = [
  ['apple-touch-icon.png', 180],
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['favicon-32.png', 32],
]

for (const [name, size] of targets) {
  const buf = encodePng(size, render(size))
  for (const dir of outDirs) {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, name), buf)
  }
  console.log(`[make-icons] ${name} (${size}x${size}, ${buf.length} B) -> ${outDirs.join(', ')}`)
}
