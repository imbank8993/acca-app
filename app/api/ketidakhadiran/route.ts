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
        const authHeader = request.headers.get('authorization');

        // Get user role for access control
        let userRole: string | null = null;
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const anonSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            if (authHeader) {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user } } = await anonSupabase.auth.getUser(token);

                if (user?.id) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('role')
                        .eq('auth_id', user.id)
                        .single();

                    userRole = userData?.role || null;
                }
            }
        } catch (authError) {
            console.warn('[GET] Auth check failed:', authError);
        }

        // Use Service Role client to bypass RLS for this API logic
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let query = supabaseAdmin
            .from('ketidakhadiran')
            .select('id, jenis, nisn, nama, kelas, tgl_mulai, tgl_selesai, status, keterangan, aktif, created_at, updated_at')
            .eq('aktif', true)
            .order('created_at', { ascending: false });

        // Role-based filtering
        if (userRole === 'OP_Izin') {
            query = query.eq('jenis', 'IZIN');
        } else if (userRole === 'OP_UKS') {
            query = query.eq('jenis', 'SAKIT');
        }
        // Admin, Guru, Kepala Madrasah see all (falls through)

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
            data: rows
        });

    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
