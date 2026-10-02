const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const dotenv = require('dotenv')
const source = dotenv.parse(fs.readFileSync('.env'))
const selected = {}
for (const key of [
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
  'IMAGE_STORAGE_PROVIDER', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL',
]) {
  if (source[key]) selected[key] = source[key]
}
const result = spawnSync('ssh', ['-o', 'BatchMode=yes', 'digitalocean', 'node /home/appuser/deploy-production/configure-env.cjs'], { input: JSON.stringify(selected), encoding: 'utf8' })
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
process.exitCode = result.status || 0
