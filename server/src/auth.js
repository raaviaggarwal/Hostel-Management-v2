import jwt from 'jsonwebtoken'

export const SECRET = process.env.JWT_SECRET || 'dev-secret'

export const WARDEN_ROLES = ['warden', 'chief_warden', 'deputy_warden', 'assistant_warden']

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '24h' })
}

export function publicUser(user) {
  const { password: _password, ...rest } = user
  return rest
}