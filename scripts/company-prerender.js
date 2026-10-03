import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createServer, normalizePath } from 'vite'
import { companyHtml, isCompanyPath } from './company-html.js'

const entry = '/src/views/CompanyHome/prerender.jsx'

function devStyles(server, root) {
  const styles = new Set(['/src/index.css?direct', '/src/styles/ui.css?direct'])
  const visited = new Set()
  const visit = (module) => {
    if (!module || visited.has(module)) return
    visited.add(module)
    for (const dependency of module.importedModules) visit(dependency)
    if (module.file?.endsWith('.css')) styles.add(`${module.url}?direct`)
  }
  visit(server.moduleGraph.getModuleById(normalizePath(path.join(root, entry))))
  return [...styles]
}

function buildStyles(manifest) {
  const styles = new Set()
  const visited = new Set()
  const visit = (key) => {
    if (visited.has(key)) return
    visited.add(key)
    const chunk = manifest[key]
    if (!chunk) throw new Error(`Falta el recurso de /home en el manifest: ${key}`)
    for (const imported of chunk.imports || []) visit(imported)
    for (const css of chunk.css || []) styles.add(`/${css}`)
  }
  visit('index.html')
  visit('src/views/CompanyHome/index.jsx')
  return [...styles]
}

export default function companyPrerender() {
  let config
  return {
    name: 'company-home-prerender',
    configResolved(resolved) { config = resolved },
    transformIndexHtml: {
      order: 'post',
      async handler(html, context) {
        if (!context.server || !isCompanyPath(context.originalUrl || context.path)) return html
        const { renderCompanyPage } = await context.server.ssrLoadModule(entry)
        return companyHtml(html, renderCompanyPage(), devStyles(context.server, config.root))
      },
    },
    async closeBundle() {
      if (config.command !== 'build' || config.build.ssr) return
      const server = await createServer({
        configFile: config.configFile,
        root: config.root,
        mode: config.mode,
        appType: 'custom',
        logLevel: 'error',
        server: { middlewareMode: true, hmr: false, watch: null },
        optimizeDeps: { noDiscovery: true, include: [] },
      })
      try {
        const output = path.resolve(config.root, config.build.outDir)
        const [{ renderCompanyPage }, template, rawManifest] = await Promise.all([
          server.ssrLoadModule(entry),
          readFile(path.join(output, 'index.html'), 'utf8'),
          readFile(path.join(output, '.vite/manifest.json'), 'utf8'),
        ])
        const html = companyHtml(template, renderCompanyPage(), buildStyles(JSON.parse(rawManifest)))
        await writeFile(path.join(output, 'home.html'), html)
        config.logger.info(`Prerender /home: ${(Buffer.byteLength(html) / 1024).toFixed(1)} kB de HTML con contenido.`)
      } finally {
        await server.close()
      }
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (isCompanyPath(req.url) && ['GET', 'HEAD'].includes(req.method)) {
          const search = new URL(req.url, 'http://localhost').search
          req.url = `/home.html${search}`
        }
        next()
      })
    },
  }
}
