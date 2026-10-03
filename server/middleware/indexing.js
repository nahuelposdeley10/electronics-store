import { NO_INDEX, shouldNoIndex } from '../../src/lib/indexing.js'

// Run before static files and redirects so GET and HEAD work without JavaScript.
export function indexingHeaders(req, res, next) {
  if (shouldNoIndex(req.originalUrl || req.url)) res.setHeader('X-Robots-Tag', NO_INDEX)
  next()
}
