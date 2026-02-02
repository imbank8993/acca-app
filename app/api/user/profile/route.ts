import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function PUT(request: NextRequest) {
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
        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { username, nama, photoUrl, password, oldPassword, removeOldFileUrl } = body;

        const updateData: any = {};
        if (username) updateData.username = username;
        if (nama) updateData.nama = nama;

        // Handle photo URL (can be null if removed)
        if (photoUrl === null || photoUrl) {
            updateData.foto_profil = photoUrl;
        }

        // Handle physical file deletion if requested
        if (removeOldFileUrl) {
            try {
                const formData = new FormData();
                formData.append('old_file', removeOldFileUrl);
                formData.append('folder', 'profil_users');

                await fetch('https://icgowa.sch.id/acca.icgowa.sch.id/acca_upload.php', {
                    method: 'POST',
                    body: formData
                });
            } catch (err) {
                console.error('Failed to notify hosting for deletion:', err);
            }
        }

        // Handle Password Update with Auth
        if (password) {
            // Update password using admin API (No old password check required per user request)
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                authUser.id,
                {
                    password: password,
                    user_metadata: {
                        username: username || undefined,
                        nama: nama || undefined
                    }
                }
            );

            if (authError) {
                return NextResponse.json({ ok: false, error: 'Gagal update auth: ' + authError.message }, { status: 400 });
            }

            // Global Logout for all devices
            await supabaseAdmin.auth.admin.signOut(authUser.id, 'global');

            updateData.password_hash = password;
        } else {
            // Update metadata even if password is not changed
            await supabaseAdmin.auth.admin.updateUserById(
                authUser.id,
                {
                    user_metadata: {
                        username: username || undefined,
                        nama: nama || undefined,
                        avatar_url: photoUrl || undefined
                    }
                }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('auth_id', authUser.id)
            .select()
            .single();

        if (error) {
            console.error('Database update error:', error);
            if (error.code === '42703') { // Column not found
                return NextResponse.json({
                    ok: false,
                    error: 'Database schema mismatch. Kolom foto_profil tidak ditemukan. Silakan tambahkan kolom tersebut ke tabel users.'
                }, { status: 500 });
            }
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, data, message: 'Profil berhasil diperbarui' });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
