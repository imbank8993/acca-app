import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tanggal = searchParams.get('tanggal');
        const kelas = searchParams.get('kelas');
        const jam_ke_id = searchParams.get('jam_ke_id');

        if (!tanggal || !kelas || !jam_ke_id) {
            return corsResponse(NextResponse.json({ ok: false, error: 'Missing parameters' }, { status: 400 }));
        }

        const jamIds = jam_ke_id.includes(',')
            ? jam_ke_id.split(',').map(id => parseInt(id.trim()))
            : [parseInt(jam_ke_id)];

        const { data: matches, error } = await supabaseAdmin
            .from('jurnal_guru')
            .select('*')
            .eq('tanggal', tanggal)
            .eq('kelas', kelas)
            .in('jam_ke_id', jamIds);

        if (error) throw error;

        const isEmpty = (v: any) => v === null || v === undefined || String(v).trim() === '';

        // Pick the best match: 
        // 1. Prioritize any record that HAS content (materi or refleksi)
        // 2. If content exists in multiple, prioritize source (GURU > ADMIN > SISWA)
        const data = matches?.sort((a, b) => {
            const hasA = !isEmpty(a.materi) || !isEmpty(a.refleksi);
            const hasB = !isEmpty(b.materi) || !isEmpty(b.refleksi);

            if (hasA && !hasB) return -1;
            if (!hasA && hasB) return 1;

            const priority = { 'GURU': 2, 'ADMIN': 1, 'SISWA': 0 };
            const pA = priority[a.filled_by as keyof typeof priority] || 0;
            const pB = priority[b.filled_by as keyof typeof priority] || 0;
            return pB - pA;
        })[0] || null;

        if (error) throw error;

        return corsResponse(NextResponse.json({
            ok: true,
            data: data || null
        }));
    } catch (error: any) {
        console.error('Check slot error:', error);
        return corsResponse(NextResponse.json({ ok: false, error: error.message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
