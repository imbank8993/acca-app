import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const kelas = searchParams.get('kelas');
        const tanggal = searchParams.get('tanggal');

        if (!kelas || !tanggal) {
            return NextResponse.json(
                { ok: false, error: 'Parameter kelas dan tanggal wajib diisi' },
                { status: 400 }
            );
        }

        // Query ketidakhadiran where tanggal is within [tgl_mulai, tgl_selesai]
        const { data, error } = await supabase
            .from('ketidakhadiran')
            .select('id, jenis, nisn, nama, kelas, status, keterangan, tgl_mulai, tgl_selesai')
            .eq('kelas', kelas)
            .eq('aktif', true)
            .lte('tgl_mulai', tanggal)
            .gte('tgl_selesai', tanggal);

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json(
                { ok: false, error: 'Gagal mengambil data ketidakhadiran' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            data: data || []
        });

    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
