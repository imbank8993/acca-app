import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';

        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        let query = supabase
            .from('users')
            .select('id, nama_lengkap, username')
            .eq('aktif', true)
            .neq('auth_id', authUser.id) // Don't share with self
            .order('nama_lengkap', { ascending: true })
            .limit(20);

        if (q) {
            query = query.or(`nama_lengkap.ilike.%${q}%,username.ilike.%${q}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
