import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'

const configuredSecret = process.env.JWT_SECRET
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

export const SECRET = configuredSecret || 'dev-secret'
export const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10)
export const JWT_ISSUER = 'hostel-management'
export const JWT_AUDIENCE = 'hostel-management-web'

export const WARDEN_ROLES = ['warden', 'chief_warden', 'deputy_warden', 'assistant_warden']

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, ver: user.tokenVersion },
    SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      jwtid: randomUUID(),
    }
  )
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
}

export function publicUser(user) {
  const { password: _password, ...rest } = user
  return rest
}