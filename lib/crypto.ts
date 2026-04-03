import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex')
  }
  const buf = Buffer.from(key, 'base64')
  if (buf.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)')
  }
  return buf
}

// Use Uint8Array casts to avoid Node 22 Buffer type incompatibility with TS
const concat = (...bufs: Buffer[]): Buffer => Buffer.concat(bufs as unknown as Uint8Array[])

export function encrypt(plaintext: string): string {
  const key = Uint8Array.from(getKey())
  const iv = Uint8Array.from(randomBytes(IV_LENGTH))
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const updated = cipher.update(plaintext, 'utf8')
  const final = cipher.final()
  const tag = cipher.getAuthTag()

  const encrypted = concat(Buffer.from(iv), updated, final)
  const packed = concat(encrypted, tag)
  return packed.toString('base64')
}

export function decrypt(ciphertext: string): string {
  const key = Uint8Array.from(getKey())
  const packed = Buffer.from(ciphertext, 'base64')

  const iv = Uint8Array.from(packed.subarray(0, IV_LENGTH))
  const tag = packed.subarray(packed.length - TAG_LENGTH)
  const encrypted = packed.subarray(IV_LENGTH, packed.length - TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(Uint8Array.from(tag))

  const updated = decipher.update(Uint8Array.from(encrypted))
  const final = decipher.final()
  const decrypted = concat(updated, final)

  return decrypted.toString('utf8')
}
