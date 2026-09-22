import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const src = 'C:/Users/oscar/.gemini/antigravity/brain/69294469-9721-45f6-8325-e5b23a09d195/aburria_knit_robot_1790049644464.jpg'
const pub = path.resolve('public')
const iconsDir = path.join(pub, 'icons')

async function main() {
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }

  console.log('Generating PNG and WebP assets...')

  // 1. 512x512 icons
  await sharp(src).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'))
  await sharp(src).resize(512, 512).png().toFile(path.join(iconsDir, 'icon.png'))

  // 2. 192x192 icon
  await sharp(src).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'))

  // 3. Apple touch icon 180x180
  await sharp(src).resize(180, 180).png().toFile(path.join(pub, 'apple-touch-icon.png'))

  // 4. Favicon PNGs
  await sharp(src).resize(64, 64).png().toFile(path.join(pub, 'favicon.png'))
  await sharp(src).resize(32, 32).png().toFile(path.join(pub, 'favicon-32.png'))

  // 5. Maskable icon (safe area scaled with matching pastel border)
  const inner = await sharp(src).resize(410, 410).png().toBuffer()
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 232, g: 244, b: 250, alpha: 1 },
    },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'))

  // 6. Hero image (WebP + PNG)
  await sharp(src).resize(1024, 1024).webp({ quality: 92 }).toFile(path.join(pub, 'hero-knit.webp'))
  await sharp(src).resize(1024, 1024).png().toFile(path.join(pub, 'hero-knit.png'))

  // 7. Update SVG files with embedded high-res PNG data URL for perfect fallback compatibility
  const png512Base64 = fs.readFileSync(path.join(iconsDir, 'icon-512.png')).toString('base64')
  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" href="data:image/png;base64,${png512Base64}"/>
</svg>
`
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon, 'utf8')

  const png64Base64 = fs.readFileSync(path.join(pub, 'favicon.png')).toString('base64')
  const svgFav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <image width="64" height="64" href="data:image/png;base64,${png64Base64}"/>
</svg>
`
  fs.writeFileSync(path.join(pub, 'favicon.svg'), svgFav, 'utf8')

  console.log('Successfully generated all icons and hero assets!')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
