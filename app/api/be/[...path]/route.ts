import { NextResponse, type NextRequest } from 'next/server'
import { isAllowed } from '@/lib/allowlist'
import { backendBase, backendHeaders } from '@/lib/backend'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

type Ctx = { params: Promise<{ path: string[] }> }

async function handler(req: NextRequest, ctx: Ctx) {
  // Primární guard je proxy.ts; tady jen obrana do hloubky.
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !(await verifySession(token))) {
    return NextResponse.json({ message: 'Nepřihlášen.' }, { status: 401 })
  }

  const { path } = await ctx.params
  const joined = path.join('/')
  if (!isAllowed(req.method, joined)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const url = `${backendBase()}/${joined}${req.nextUrl.search}`
  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text()

  let res: Response
  try {
    res = await fetch(url, {
      method: req.method,
      headers: backendHeaders(),
      body,
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ message: 'Backend není dostupný.' }, { status: 502 })
  }

  // Status i tělo se předávají beze změny (frontend čte data.message z chyb).
  // Hlavičky se skládají znovu — content-encoding/length už neplatí po dekompresi.
  return new NextResponse(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  })
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE }
