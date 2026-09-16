import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const svg = await readFile(new URL('../resources/icon.svg', import.meta.url))
await sharp(svg)
  .resize(512, 512)
  .png()
  .toFile(fileURLToPath(new URL('../resources/icon.png', import.meta.url)))
const png = await sharp(svg).resize(256, 256).png().toBuffer()
const header = Buffer.alloc(22)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(1, 4)
header.writeUInt16LE(1, 10)
header.writeUInt16LE(32, 12)
header.writeUInt32LE(png.length, 14)
header.writeUInt32LE(22, 18)
await writeFile(new URL('../resources/icon.ico', import.meta.url), Buffer.concat([header, png]))
const tray = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="black" stroke-width="2"/><path d="M12 6v6l4 3" fill="none" stroke="black" stroke-width="2" stroke-linecap="round"/></svg>'
)
for (const size of [18, 36]) {
  await writeFile(
    new URL(`../resources/trayTemplate${size === 36 ? '@2x' : ''}.png`, import.meta.url),
    await sharp(tray).resize(size, size).png().toBuffer()
  )
}
console.log('App and tray icons built.')
