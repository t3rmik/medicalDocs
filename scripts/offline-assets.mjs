import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'

const root = process.cwd()
const publicDir = resolve(root, 'public')
const staticDir = resolve(root, '.next/static')

async function walk(directory) {
  let entries
  try { entries = await readdir(directory, { withFileTypes: true }) }
  catch (error) { if (error?.code === 'ENOENT') return []; throw error }
  const output = []
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name)
    if (entry.isDirectory()) output.push(...await walk(fullPath))
    else if (entry.isFile()) output.push(fullPath)
  }
  return output
}

async function prepare() {
  await mkdir(publicDir, { recursive: true })
  const source = resolve(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.js')
  const destination = resolve(publicDir, 'pdf.worker.min.js')
  await stat(source)
  await copyFile(source, destination)
  console.log('[offline] Copied PDF.js worker to public/pdf.worker.min.js')
}

async function generateManifest() {
  const files = await walk(staticDir)
  if (files.length === 0) throw new Error('No files found in .next/static; refusing to generate an empty offline manifest.')
  const extensions = new Set(['.js','.mjs','.css','.wasm','.woff','.woff2','.ttf','.otf','.svg','.png','.jpg','.jpeg','.webp','.avif','.gif','.ico'])
  const coreExtensions = new Set(['.js','.mjs','.css','.wasm'])
  const entries = []
  for (const filePath of files) {
    const extension = extname(filePath).toLowerCase()
    if (!extensions.has(extension) || filePath.endsWith('.map')) continue
    const fileStat = await stat(filePath)
    const urlPath = '/_next/static/' + relative(staticDir, filePath).split(sep).join('/')
    entries.push({ url: urlPath, bytes: fileStat.size, core: coreExtensions.has(extension) })
  }
  const publicAssets = ['/pdf.worker.min.js','/medicaldocs-mark.svg','/medicaldocs-mark.png','/icons/medicaldocs-192.png','/icons/medicaldocs-512.png']
  for (const url of publicAssets) {
    try {
      entries.push({ url, bytes: (await stat(resolve(publicDir, url.slice(1))).then((s) => s.size)), core: url === '/pdf.worker.min.js' })
    } catch { if (url === '/pdf.worker.min.js') throw new Error('PDF.js worker missing from public directory.') }
  }
  entries.sort((a,b) => Number(b.core)-Number(a.core) || b.bytes-a.bytes)
  const core = entries.filter((entry) => entry.core)
  const optional = entries.filter((entry) => !entry.core)
  const maxEntries = 600, maxBytes = 120 * 1024 * 1024
  const coreBytes = core.reduce((sum,item)=>sum+item.bytes,0)
  if (core.length > maxEntries || coreBytes > maxBytes) throw new Error('Offline essential assets exceed the safe cache budget.')
  const selected = [...core]
  let totalBytes = coreBytes
  for (const entry of optional) {
    if (selected.length >= maxEntries || totalBytes + entry.bytes > maxBytes) continue
    selected.push(entry); totalBytes += entry.bytes
  }
  const manifest = {
    version: 2, generatedAt: new Date().toISOString(),
    assetCount: selected.length, essentialAssetCount: core.length, estimatedBytes: totalBytes,
    assets: selected.map(({url,bytes,core})=>({url,bytes,core})),
  }
  await writeFile(resolve(publicDir,'medicaldocs-offline-assets.json'),JSON.stringify(manifest),'utf8')
  console.log(\`[offline] Wrote \${manifest.assetCount} assets (\${manifest.essentialAssetCount} essential, \${Math.round(totalBytes/1024/1024)} MiB) to public/medicaldocs-offline-assets.json\`)
}

const mode = process.argv[2]
if (mode === 'prepare') await prepare()
else if (mode === 'manifest') await generateManifest()
else throw new Error('Usage: node scripts/offline-assets.mjs prepare|manifest')
