// Reads the Vite build output and produces a single-file HTML with inlined JS+CSS
import { readFileSync, writeFileSync, readdirSync } from 'fs'

const dist = new URL('./dist/', import.meta.url).pathname
const assetsDir = dist + 'assets/'

const jsFile = readdirSync(assetsDir).find(f => f.endsWith('.js'))
const cssFile = readdirSync(assetsDir).find(f => f.endsWith('.css'))

const js = readFileSync(assetsDir + jsFile, 'utf8')
const css = readFileSync(assetsDir + cssFile, 'utf8')

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gani — Time Blocking</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js}</script>
  </body>
</html>`

writeFileSync(dist + 'inline.html', html)
console.log('Written dist/inline.html (' + Math.round(html.length / 1024) + ' KB)')
