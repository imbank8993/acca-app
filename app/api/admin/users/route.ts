import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildUserObject } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// GET /api/admin/users - List all users with filtering
export async function GET(request: NextRequest) {
    try {
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

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const aktifFilter = searchParams.get('aktif'); // 'true', 'false', or null (all)
        const roleFilter = searchParams.get('role'); // specific role or null (all)
        const searchQuery = searchParams.get('search'); // search in username or nama

        // Build query
        let query = supabaseAdmin
            .from('users')
            .select('*')
            .order('nama', { ascending: true });

        // Apply filters
        if (aktifFilter !== null) {
            query = query.eq('aktif', aktifFilter === 'true');
        }

        if (roleFilter) {
            query = query.ilike('role', `%${roleFilter}%`);
        }

        if (searchQuery) {
            query = query.or(`username.ilike.%${searchQuery}%,nama.ilike.%${searchQuery}%,nip.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching users:', error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        // Build user objects with parsed roles and pagesTree
        const users = await Promise.all((data || []).map(buildUserObject));

        return NextResponse.json({
            ok: true,
            data: users,
            count: users.length
        });
    } catch (error: any) {
        console.error('Error in GET /api/admin/users:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
