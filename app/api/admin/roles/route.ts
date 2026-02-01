import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { checkPermission } from '@/lib/permissions';

// GET /api/admin/roles - Fetch all roles
export async function GET() {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch { }
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        // Check if user is admin
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('auth_id', user.id)
            .single();

        if (!userData || !userData.role?.toUpperCase().includes('ADMIN')) {
            return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
        }

        const { data: roles, error } = await supabaseAdmin
            .from('roles')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ ok: true, data: roles });
    } catch (error: any) {
        console.error('Error fetching roles:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

// POST /api/admin/roles - Add new role
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch { }
                    },
                },
            }
        );

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        const { data: dbUser } = await supabaseAdmin.from('users').select('role').eq('auth_id', authUser.id).single();
        if (!dbUser || !dbUser.role?.toLowerCase().includes('admin')) {
            return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { name, description } = body;

        if (!name) return NextResponse.json({ ok: false, error: 'Role name is required' }, { status: 400 });

        const normalizedName = name.toUpperCase().replace(/\s+/g, '_');

        const { data, error } = await supabaseAdmin
            .from('roles')
            .insert({ name: normalizedName, description })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        console.error('Error adding role:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
// DELETE /api/admin/roles - Delete a role
export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch { }
                    },
                },
            }
        );

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        const { data: dbUser } = await supabaseAdmin.from('users').select('role').eq('auth_id', authUser.id).single();
        if (!dbUser || !dbUser.role?.toLowerCase().includes('admin')) {
            return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ ok: false, error: 'Role ID required' }, { status: 400 });
        }

        // Prevent deleting critical roles (hardcoded safeguard)
        const { data: roleToDelete } = await supabaseAdmin.from('roles').select('name').eq('id', id).single();
        if (roleToDelete) {
            const protectedRoles = ['ADMIN', 'GURU', 'WALI KELAS'];
            if (protectedRoles.includes(roleToDelete.name.toUpperCase().replace('_', ' '))) {
                return NextResponse.json({ ok: false, error: 'Cannot delete system default roles' }, { status: 400 });
            }
        }

        const { error } = await supabaseAdmin
            .from('roles')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Error deleting role:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
