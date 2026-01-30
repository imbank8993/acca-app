import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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
                            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
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
        const { users } = body;

        if (!users || !Array.isArray(users)) {
            return NextResponse.json({ ok: false, error: 'Invalid data format' }, { status: 400 });
        }

        // 1. Process Passwords (via Admin Auth API)
        const passwordResults = { success: 0, failed: 0 };
        for (const u of users) {
            // Only update if password is provided and not the masked placeholder
            if (u.password && u.password !== '****' && u.auth_id) {
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                    u.auth_id,
                    { password: u.password }
                );
                if (authError) {
                    console.error(`Failed to update password for ${u.username}:`, authError.message);
                    passwordResults.failed++;
                } else {
                    passwordResults.success++;
                }
            }
            // Clean up password field before DB upsert (it doesn't exist in 'users' table)
            delete u.password;

        }

        // 2. Process Profile Data (via UPSERT)
        const { error } = await supabaseAdmin.from('users').upsert(users, { onConflict: 'username' });

        if (error) {
            console.error('Bulk upsert error:', error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        let message = `Berhasil memproses ${users.length} user.`;
        if (passwordResults.success > 0) message += ` ${passwordResults.success} password diperbarui.`;
        if (passwordResults.failed > 0) message += ` ${passwordResults.failed} password GAGAL diperbarui (cek auth_id).`;

        return NextResponse.json({ ok: true, message });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
