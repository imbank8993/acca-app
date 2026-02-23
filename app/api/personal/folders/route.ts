import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get public.users.id
        const { data: dbUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.id)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ ok: false, error: 'Internal User not found' }, { status: 404 });
        }

        const { data, error } = await supabase
            .from('personal_folders')
            .select('*')
            .eq('user_id', dbUser.id)
            .order('nama', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { nama } = await request.json();
        if (!nama) {
            return NextResponse.json({ ok: false, error: 'Nama folder harus diisi' }, { status: 400 });
        }

        // Get public.users.id
        const { data: dbUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.id)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ ok: false, error: 'Internal User not found' }, { status: 404 });
        }

        const { data, error } = await supabase
            .from('personal_folders')
            .insert([{ user_id: dbUser.id, nama }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
