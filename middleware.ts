import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = await fetch(request.url, { headers: request.headers })
  const requestUrl = new URL(request.url)
  
  // Create a response object we can modify
  const response = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req: request, res: response })
  
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession()
  
  // Define protected routes
  const protectedRoutes = ['/projects', '/tasks', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  // If the user is not signed in and the current route is protected
  if (!session && isProtectedRoute) {
    // Redirect to the login page with the returnTo parameter
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('returnTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  // If user is signed in and tries to access auth pages, redirect to home
  const authRoutes = ['/login', '/signup', '/forgot-password']
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/projects', request.url))
  }
  
  return response
}

// Configure which routes the middleware will run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/).*)',
  ],
}
