import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage =
      req.nextUrl.pathname.startsWith('/login') ||
      req.nextUrl.pathname.startsWith('/register')

    // Allow public routes
    const isPublicRoute = [
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/api/health'
    ].includes(req.nextUrl.pathname)

    if (isPublicRoute) {
      return NextResponse.next()
    }

    // Handle auth pages (login/register)
    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return NextResponse.next()
    }

    // Check authentication
    if (!isAuth) {
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }

      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      )
    }

    // Check if user is banned or deleted
    if (token?.status !== 'active') {
      // Allow logout even if banned
      if (req.nextUrl.pathname === '/api/auth/signout') {
        return NextResponse.next()
      }
      
      return NextResponse.redirect(
        new URL(`/banned?reason=${token.status}`, req.url)
      )
    }

    // Handle admin routes
    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Handle API routes
    if (req.nextUrl.pathname.startsWith('/api/admin')) {
      if (token?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/profile/:path*',
    '/project/:path*',
    '/api/admin/:path*',
    '/banned',
    '/login',
    '/register',
  ],
}