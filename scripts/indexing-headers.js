import { indexingHeaders } from '../server/middleware/indexing.js'

export default function indexingHeadersPlugin() {
  return {
    name: 'indexing-headers',
    configureServer(server) { server.middlewares.use(indexingHeaders) },
    configurePreviewServer(server) { server.middlewares.use(indexingHeaders) },
  }
}
