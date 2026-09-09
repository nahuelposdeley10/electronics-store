import crypto from 'crypto'

export function generatePassword(length = 12) {
  const alphabet = 'abcdefghijkmnprstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ2345678$#!'
  const values = crypto.randomBytes(length)
  let password = ''
  for (let i = 0; i < length; i += 1) {
    password += alphabet[values[i] % alphabet.length]
  }
  return password
}