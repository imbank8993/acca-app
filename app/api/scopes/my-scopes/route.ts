
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
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

        // Get NIP from users table using auth_id
        const { data: dbUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('nip, nama, role')
            .eq('auth_id', authUser.id)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ ok: false, error: 'User not found in database' }, { status: 404 });
        }

        return NextResponse.json({
            ok: true,
            guru: {
                nip: dbUser.nip,
                nama: dbUser.nama,
                role: dbUser.role
            }
        });

    } catch (error: any) {
        console.error('Error in /api/scopes/my-scopes:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
