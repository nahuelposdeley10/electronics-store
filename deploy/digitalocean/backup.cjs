const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
const { createRequire } = require('node:module')
const appRequire = createRequire('/var/www/electronics-store/package.json')
const env = appRequire('dotenv').parse(fs.readFileSync('/var/www/electronics-store/.env'))
const directory = '/var/backups/electronics-store'
fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const archive = path.join(directory, `electronics-store-${stamp}.archive.gz`)
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'electronics-backup-'))
const config = path.join(temporary, 'mongo-config.json')
const uri = new URL(env.MONGODB_URI)
uri.pathname = '/electronics-store'
fs.writeFileSync(config, JSON.stringify({ uri: uri.toString() }), { mode: 0o600 })
try {
  const result = spawnSync('/opt/electronics-mongodb/bin/mongodump', ['--config', config, '--db', 'electronics-store', '--gzip', '--archive=' + archive, '--numParallelCollections=1', '--quiet'], { stdio: 'pipe' })
  if (result.status !== 0) throw new Error('Database backup failed; exit code ' + result.status)
  fs.chmodSync(archive, 0o600)
  const verify = spawnSync('/opt/electronics-mongodb/bin/mongorestore', ['--config', config, '--gzip', '--archive=' + archive, '--dryRun', '--quiet'], { stdio: 'pipe' })
  if (verify.status !== 0) throw new Error('Backup archive validation failed; exit code ' + verify.status)
  console.log('BACKUP_VERIFIED', path.basename(archive), fs.statSync(archive).size, 'bytes')
} finally {
  fs.unlinkSync(config)
  fs.rmdirSync(temporary)
}
