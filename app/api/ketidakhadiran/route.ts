import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const kelas = searchParams.get('kelas');
        const jenis = searchParams.get('jenis');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const q = searchParams.get('q') || '';

        let query = supabase
            .from('ketidakhadiran')
            .select('*')
            .eq('aktif', true)
            .order('created_at', { ascending: false });

        // Filters
        if (kelas) {
            query = query.eq('kelas', kelas);
        }

        if (jenis) {
            query = query.eq('jenis', jenis);
        }

        const monthsStr = searchParams.get('months');
        const year = new Date().getFullYear(); // Default to current year

        if (monthsStr) {
            // Filter by specific months
            // Strategy: Fetch all data for the year, then filter in memory (simplest for Supabase limitation on date parts without RPC)
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;

            query = query
                .gte('tgl_mulai', startDate)
                .lte('tgl_mulai', endDate);
        } else if (from && to) {
            // Date range filter: overlap with [from, to]
            query = query
                .lte('tgl_mulai', to)
                .gte('tgl_selesai', from);
        }

        if (q) {
            // Search in nisn, nama, kelas
            query = query.or(`nisn.ilike.%${q}%,nama.ilike.%${q}%,kelas.ilike.%${q}%`);
        }

        const { data, error } = await query;

        let rows = data || [];

        // Apply strict month filtering in memory if requested
        if (monthsStr && rows.length > 0) {
            const targetMonths = monthsStr.split(',').map(Number);
            rows = rows.filter((row: any) => {
                const d = new Date(row.tgl_mulai);
                const m = d.getMonth() + 1; // 1-12
                return targetMonths.includes(m);
            });
        }

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json(
                { ok: false, error: 'Gagal mengambil data ketidakhadiran' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            rows: data || []
        });

    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
