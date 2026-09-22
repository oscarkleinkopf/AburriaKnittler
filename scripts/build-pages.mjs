import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')

console.log('Building for GitHub Pages with base /AburriaKnittler/ ...')

// Run Vite build with VITE_BASE environment variable
execSync('npm run build', {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_BASE: '/AburriaKnittler/',
  },
})

const indexHtml = resolve(dist, 'index.html')
const notFoundHtml = resolve(dist, '404.html')
const nojekyll = resolve(dist, '.nojekyll')

if (existsSync(indexHtml)) {
  copyFileSync(indexHtml, notFoundHtml)
  console.log('Created dist/404.html from dist/index.html')
}

writeFileSync(nojekyll, '')
console.log('Created dist/.nojekyll')
console.log('Pages build completed successfully.')
