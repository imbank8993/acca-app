import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function OPTIONS() {
    return handleOptions();
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'guru' or 'siswa'
    const q = searchParams.get('q') || '';

    const supabase = await createClient();

    try {
        if (type === 'guru') {
            let query = supabase
                .from('master_guru')
                .select('nip, nama_lengkap')
                .eq('aktif', true)
                .order('nama_lengkap', { ascending: true })
                .limit(20);

            if (q) {
                query = query.ilike('nama_lengkap', `%${q}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            return corsResponse(NextResponse.json(data.map(g => ({
                label: g.nama_lengkap,
                value: g.nama_lengkap,
                id: g.nip
            }))));
        }
        else if (type === 'siswa') {
            let query = supabase
                .from('siswa_kelas')
                .select('nisn, nama, kelas')
                .eq('aktif', true)
                .order('nama', { ascending: true })
                .limit(20);

            if (q) {
                query = query.ilike('nama', `%${q}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            return corsResponse(NextResponse.json(data.map(s => ({
                label: `${s.nama} (${s.kelas})`,
                value: s.nama,
                id: s.nisn
            }))));
        }

        return corsResponse(NextResponse.json({ error: 'Invalid type' }, { status: 400 }));
    } catch (error: any) {
        return corsResponse(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
