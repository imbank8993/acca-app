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
// POST /api/admin/users - Create new user record
export async function POST(request: NextRequest) {
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
                            // Ignored
                        }
                    },
                },
            }
        );

        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: dbUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('auth_id', authUser.id)
            .single();

        if (!dbUser || !dbUser.role?.toLowerCase().includes('admin')) {
            return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { username, nip, nama, nama_lengkap, divisi, role, pages, password } = body;

        if (!username || !nip || !nama) {
            return NextResponse.json({ ok: false, error: 'Username, NIP, and Nama are required' }, { status: 400 });
        }

        // Check if NIP or Username already exists
        const { data: existing } = await supabaseAdmin
            .from('users')
            .select('id')
            .or(`username.eq.${username},nip.eq.${nip}`)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ ok: false, error: 'Username or NIP already exists' }, { status: 400 });
        }

        // 1. Create Auth User if password is provided
        let authId = null;
        if (password) {
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: `${username}@acca.local`,
                password: password,
                email_confirm: true,
                user_metadata: { username, nama, roles: role ? role.split(',') : ['GURU'], nama_lengkap: nama_lengkap || nama }
            });

            if (authError) {
                console.error('Auth creation error:', authError);
                // We should probably fail here if they provided a password
                return NextResponse.json({ ok: false, error: 'Auth failed: ' + authError.message }, { status: 500 });
            }
            authId = authData.user?.id;
        }

        const newUser = {
            username,
            nip,
            nama,
            nama_lengkap: nama_lengkap || nama,
            divisi: divisi || '',
            role: role || 'GURU',
            pages: pages || 'Dashboard',
            password_hash: password || null,
            auth_id: authId,
            aktif: true,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabaseAdmin
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        console.error('Error in POST /api/admin/users:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
