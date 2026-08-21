import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const authenticated = token ? await verifySession(token) : false
  const { pathname } = request.nextUrl

  if (authenticated) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (pathname === '/login') {
    return NextResponse.next()
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ message: 'Nepřihlášen.' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  // /api/session musí zůstat mimo guard, jinak se nelze přihlásit;
  // statické assety mimo guard, jinak by login stránka byla bez stylů.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|api/session).*)'],
}
