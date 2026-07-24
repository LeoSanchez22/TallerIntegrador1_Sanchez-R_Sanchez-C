import crypto from 'crypto'

process.env.NODE_ENV = 'test'
export const TEST_JWT_SECRET = 'test-jwt-secret-key-32-chars-long!!'
process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
process.env.MODEL_UPLOAD_TOKEN = 'test-token-secret-123'

/**
 * Genera un token JWT HS256 valido para las pruebas unitarias
 */
export function generateTestJWT(payloadData = {}, secret = TEST_JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'test.admin@laboratoriossophia.com',
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    user_metadata: { role: 'admin', full_name: 'Admin Test' },
    ...payloadData
  }

  const base64UrlEncode = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  const encodedHeader = base64UrlEncode(header)
  const encodedPayload = base64UrlEncode(payload)

  const rawSecret = Buffer.from(secret, 'base64')
  const signature = crypto
    .createHmac('sha256', rawSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}
