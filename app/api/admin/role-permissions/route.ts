import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// GET /api/admin/role-permissions - Get all permissions
export async function GET(request: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ ok: false, error: 'Server configuration error' }, { status: 500 });
        }

        const cookieStore = await cookies();
        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
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
                        } catch { }
                    },
                },
            }
        );

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error('Auth check error:', authError);
            return NextResponse.json({ ok: false, error: 'Authentication failed: ' + authError.message }, { status: 401 });
        }

        if (!authUser) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

        const { data: dbUser } = await supabaseAdmin.from('users').select('role').eq('auth_id', authUser.id).single();
        if (!dbUser || !dbUser.role?.toLowerCase().includes('admin')) {
            return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
        }

        const { data: permissions, error } = await supabaseAdmin
            .from('role_permissions')
            .select('*')
            .order('role_name', { ascending: true });

        if (error) throw error;

        const { data: roles, error: rolesError } = await supabaseAdmin
            .from('roles')
            .select('*')
            .order('name', { ascending: true });

        if (rolesError) throw rolesError;

        // Fetch Master Permissions Catalog
        const { data: masterPermissions } = await supabaseAdmin
            .from('master_permissions_list')
            .select('*')
            .order('category', { ascending: true })
            .order('label', { ascending: true });

        return NextResponse.json({ ok: true, permissions, roles, masterPermissions: masterPermissions || [] });
    } catch (error: any) {
        console.error('Error fetching role permissions:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

// POST /api/admin/role-permissions - Save permission
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
        const { role_name, resource, action, is_allowed } = body;

        if (!role_name || !resource || !action) {
            return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Upsert permission
        const { data, error } = await supabaseAdmin
            .from('role_permissions')
            .upsert({
                role_name,
                resource,
                action,
                is_allowed
            }, { onConflict: 'role_name,resource,action' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        console.error('Error saving role permission:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

// DELETE /api/admin/role-permissions - Remove permission
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ ok: false, error: 'Missing permission ID' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('role_permissions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ ok: true, message: 'Permission removed' });
    } catch (error: any) {
        console.error('Error deleting role permission:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
