import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/session'

// SHA-256 digest před porovnáním sjednocuje délku vstupů, takže
// timingSafeEqual nikdy nevyhodí výjimku a neprozradí délku hesla.
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a).digest()
  const digestB = createHash('sha256').update(b).digest()
  return timingSafeEqual(digestA, digestB)
}

export async function POST(req: Request) {
  let username = ''
  let password = ''
  try {
    const body = await req.json()
    username = String(body?.username ?? '')
    password = String(body?.password ?? '')
  } catch {
    // prázdné hodnoty porovnání níže neprojdou
  }

  const expectedUser = process.env.ADMIN_USERNAME
  const expectedPass = process.env.ADMIN_PASSWORD
  if (!expectedUser || !expectedPass) {
    return NextResponse.json(
      { message: 'Přihlášení není nakonfigurováno (ADMIN_USERNAME / ADMIN_PASSWORD).' },
      { status: 500 },
    )
  }

  const userOk = safeEqual(username, expectedUser)
  const passOk = safeEqual(password, expectedPass)
  if (!userOk || !passOk) {
    return NextResponse.json({ message: 'Nesprávné přihlašovací údaje.' }, { status: 401 })
  }

  const store = await cookies()
  store.set(SESSION_COOKIE, await signSession(), sessionCookieOptions())
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 })
  return NextResponse.json({ success: true })
}
