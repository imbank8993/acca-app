import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildUserObject, parsePages } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// PUT /api/admin/users/[id]/pages - Update user page access
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Check if user is admin
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        );

        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from DB to check role
        const { data: dbUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('auth_id', authUser.id)
            .single();

        if (!dbUser || !dbUser.role?.toLowerCase().includes('admin')) {
            return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { pages } = body;

        if (typeof pages !== 'string') {
            return NextResponse.json({ ok: false, error: 'pages must be a string' }, { status: 400 });
        }

        // Validate pages format by parsing
        try {
            const parsed = parsePages(pages);
            console.log('Parsed pages:', parsed);
        } catch (parseError: any) {
            return NextResponse.json({
                ok: false,
                error: 'Invalid pages format',
                details: parseError.message
            }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('users')
            .update({ pages })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating user pages:', error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        const user = await buildUserObject(data);

        return NextResponse.json({
            ok: true,
            data: user,
            message: 'User page access updated successfully'
        });
    } catch (error: any) {
        console.error('Error in PUT /api/admin/users/[id]/pages:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
