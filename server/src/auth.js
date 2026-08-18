import jwt from 'jsonwebtoken'

const configuredSecret = process.env.JWT_SECRET
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

export const SECRET = configuredSecret || 'dev-secret'

export const WARDEN_ROLES = ['warden', 'chief_warden', 'deputy_warden', 'assistant_warden']

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '24h' })
}

export function publicUser(user) {
  const { password: _password, ...rest } = user
  return rest
}