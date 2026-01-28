import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()

    // Protected Routes Pattern
    const protectedPrefixes = ['/dashboard', '/reset-data', '/settings', '/master']
    const isProtected = protectedPrefixes.some(prefix => url.pathname.startsWith(prefix))

    // Auth Routes
    const isAuthRoute = url.pathname === '/login' || url.pathname === '/register'

    // 1. If at login but have user -> Go Dashboard
    if (user && isAuthRoute) {
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // 2. If at protected route but no user -> Go Login
    if (!user && isProtected) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 3. Root Handling / SPA Normalization
    // Allow '/' to pass through (it handles its own auth state)
    if (url.pathname === '/') {
        return response
    }

    // Redirect legacy routes to root to maintain "One URL"
    if (url.pathname === '/login' || url.pathname === '/dashboard') {
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
