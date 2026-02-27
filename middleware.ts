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
    const path = url.pathname

    // 1. Auth Routes handling
    const isAuthRoute = path === '/login' || path === '/register'
    if (user && isAuthRoute) {
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    // 2. Public paths that don't need RBAC
    const publicPaths = ['/login', '/register', '/api', '/_next', '/favicon.ico', '/logo', '/auth/callback']
    const isPublic = publicPaths.some(p => path.startsWith(p)) || path === '/'

    if (isPublic) {
        return response
    }

    // 3. Protected Route Requirement: Must be logged in
    if (!user) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 4. Dynamic RBAC Check
    try {
        // Fetch user roles and permissions
        // We use supabaseAdmin-like access or just regular supabase if we have access to these tables
        const { data: dbUser } = await supabase
            .from('users')
            .select('role')
            .eq('auth_id', user.id)
            .single();

        const roles = (dbUser?.role || '').split(/[,|]/).map((r: string) => r.trim().toUpperCase());
        const isAdmin = roles.includes('ADMIN');

        if (!isAdmin) {
            // Check permissions for non-admins
            const { data: permissions } = await supabase
                .from('role_permissions')
                .select('resource, action, is_allowed')
                .in('role_name', roles);

            if (permissions) {
                // Determine resource from path
                const slug = path.split('/')[1] || ''; // First segment after /
                if (slug) {
                    const resource = slug.replace(/-/g, '_').toLowerCase();

                    // Standard hasPermission logic
                    const hasAccess = permissions.some(p => {
                        const matchRes = p.resource === '*' || p.resource === resource || path.startsWith('/' + p.resource.replace(/_/g, '-'));
                        return matchRes && (p.action === '*' || p.action === 'view') && p.is_allowed;
                    });

                    if (!hasAccess && path !== '/dashboard') {
                        // Redirect to dashboard or unauthorized if no access to this specific page
                        url.pathname = '/dashboard'
                        return NextResponse.redirect(url)
                    }
                }
            }
        }
    } catch (err) {
        console.error('Middleware RBAC Error:', err);
    }

    return response
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
