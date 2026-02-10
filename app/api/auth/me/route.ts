import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildUserObject } from '@/lib/auth';

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

        // Get full user object using the shared logic in lib/auth.ts
        const { data: dbUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('auth_id', authUser.id)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ ok: false, error: 'User not found in database' }, { status: 404 });
        }

        const fullUser = await buildUserObject(dbUser);

        return NextResponse.json({
            ok: true,
            user: fullUser
        });

    } catch (error: any) {
        console.error('Error in /api/auth/me:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
