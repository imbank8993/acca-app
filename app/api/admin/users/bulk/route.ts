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

        // 1. Fetch existing users to check for auth_ids
        const { data: existingDbUsers } = await supabaseAdmin
            .from('users')
            .select('username, auth_id');

        const dbUserMap = new Map(existingDbUsers?.map(u => [u.username, u.auth_id]));
        const processedUsers = [];
        const passwordResults = { success: 0, failed: 0, created: 0 };

        for (const u of users) {
            // Determine Auth ID (from input or existing DB)
            let authId = u.auth_id || dbUserMap.get(u.username);
            const email = `${u.username}@acca.local`;
            const password = u.password;
            const shouldUpdatePassword = password && password !== '****';

            if (shouldUpdatePassword) {
                // SAFETY: Skip password update for the CURRENT admin user to prevent self-lockout
                if (authId === authUser.id) {
                    console.log(`Skipping password update for current user: ${u.username}`);
                } else {
                    if (authId) {
                        // Existing Auth User -> Update Password
                        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                            authId,
                            { password: password }
                        );
                        if (authError) {
                            console.error(`Failed to update password for ${u.username}:`, authError.message);
                            passwordResults.failed++;
                        } else {
                            passwordResults.success++;
                        }
                    } else {
                        // No Auth ID -> Create NEW Auth User
                        const { data: newData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                            email: email,
                            password: password,
                            email_confirm: true,
                            user_metadata: {
                                username: u.username,
                                nama: u.nama,
                                role: u.role,
                                nama_lengkap: u.nama // Fallback since we removed nama_lengkap column usage
                            }
                        });

                        if (createError) {
                            console.error(`Failed to create auth user for ${u.username}:`, createError.message);
                            passwordResults.failed++;
                        } else if (newData.user) {
                            authId = newData.user.id;
                            passwordResults.created++;
                        }
                    }
                }
            }

            // Prepare object for DB upsert
            const userToSave = {
                ...u,
                auth_id: authId,
                // Store password as hash if provided (legacy pattern support)
                password_hash: shouldUpdatePassword ? password : (u.password_hash || null)
            };

            // Remove raw password field if it exists (not in DB schema)
            delete userToSave.password;
            delete userToSave.nama_lengkap;

            // Ensure nama_lengkap is handled (if DB still expects it in some triggers, though we know column is there now)
            // We'll trust the input or fallback to nama


            processedUsers.push(userToSave);
        }

        // 2. Process Profile Data (via UPSERT)
        const { error } = await supabaseAdmin.from('users').upsert(processedUsers, { onConflict: 'username' });

        if (error) {
            console.error('Bulk upsert error:', error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        let message = `Berhasil memproses ${users.length} user.`;
        if (passwordResults.created > 0) message += ` ${passwordResults.created} user baru dibuat.`;
        if (passwordResults.success > 0) message += ` ${passwordResults.success} password diperbarui.`;
        if (passwordResults.failed > 0) message += ` ${passwordResults.failed} gagal proses auth.`;

        return NextResponse.json({ ok: true, message });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
