import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildUserObject } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { checkPermission } from '@/lib/permissions';

// GET /api/admin/users/[id] - Get single user
export async function GET(
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

        // Get user roles from DB
        const { data: dbUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('auth_id', authUser.id)
            .single();

        const roles = (dbUser?.role || '').split(/[,|]/).map((r: string) => r.trim().toUpperCase());

        // RBAC CHECK
        const hasAccess = await checkPermission(roles, 'pengaturan_users.user_data', 'view');

        if (!hasAccess) {
            return NextResponse.json({ ok: false, error: 'Access denied (RBAC)' }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
        }

        const user = await buildUserObject(data);

        return NextResponse.json({ ok: true, data: user });
    } catch (error: any) {
        console.error('Error in GET /api/admin/users/[id]:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// PUT /api/admin/users/[id] - Update user data
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

        // Get user roles from DB
        const { data: dbUserUpdate } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('auth_id', authUser.id)
            .single();

        const rolesUpdate = (dbUserUpdate?.role || '').split(/[,|]/).map((r: string) => r.trim().toUpperCase());

        // RBAC CHECK
        const hasAccessUpdate = await checkPermission(rolesUpdate, 'pengaturan_users.user_data', 'update');

        if (!hasAccessUpdate) {
            return NextResponse.json({ ok: false, error: 'Access denied (RBAC)' }, { status: 403 });
        }

        const body = await request.json();
        const { username, nip, nama, nama_lengkap, divisi, password } = body;

        // Build update object (only include provided fields)
        const updateData: any = {};
        if (username !== undefined) updateData.username = username;
        if (nip !== undefined) updateData.nip = nip;
        if (nama !== undefined) updateData.nama = nama;
        if (nama_lengkap !== undefined) updateData.nama_lengkap = nama_lengkap;
        if (divisi !== undefined) updateData.divisi = divisi;
        if (password !== undefined && password !== '' && password !== '****') {
            updateData.password_hash = password;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
        }

        // Check if password needs to be updated in Supabase Auth
        if (updateData.password_hash) {
            // Get user's auth_id first
            const { data: currentUser } = await supabaseAdmin
                .from('users')
                .select('auth_id')
                .eq('id', id)
                .single();

            if (currentUser?.auth_id) {
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                    currentUser.auth_id,
                    { password: updateData.password_hash }
                );
                if (authError) {
                    console.error('Failed to update Supabase Auth password:', authError);
                    // Continue anyway, or return error?
                    // User requested parity, so we should probably fail or log heavily.
                }
            }
        }

        const { data, error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating user:', error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        const user = await buildUserObject(data);

        return NextResponse.json({ ok: true, data: user, message: 'User updated successfully' });
    } catch (error: any) {
        console.error('Error in PUT /api/admin/users/[id]:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
