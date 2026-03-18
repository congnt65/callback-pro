import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  // Stamp the exact millisecond this request arrived at the Next.js edge
  response.headers.set('X-Request-Start', String(Date.now()))
  return response
}

export const config = {
  matcher: '/api/hook/:path*',
}
