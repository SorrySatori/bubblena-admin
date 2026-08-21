import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'admin_session'

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET
  if (!value) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(value)
}

export async function signSession(): Promise<string> {
  return new SignJWT({ sub: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret())
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    return true
  } catch {
    return false
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}
