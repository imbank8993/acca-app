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
        let query: any;

        // Get user role for access control
        let userRole: string = '';
        console.log('[GET] Fetching Ketidakhadiran. Auth present:', !!authHeader);

        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const anonSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            query = supabaseAdmin
                .from('ketidakhadiran')
                .select('id, jenis, nisn, nama, kelas, tgl_mulai, tgl_selesai, status, keterangan, aktif, file_url, created_at, updated_at')
                .eq('aktif', true)
                .order('created_at', { ascending: false });

            // Raw count for diagnosis
            const { count: rawCount } = await supabaseAdmin.from('ketidakhadiran').select('*', { count: 'exact', head: true });
            console.log('[GET] Raw record count in DB:', rawCount);

            if (authHeader) {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user }, error: authError } = await anonSupabase.auth.getUser(token);

                if (authError || !user) {
                    console.error('[GET] Auth token invalid or user not found:', authError);
                    return NextResponse.json({ ok: false, error: 'Unauthorized: Invalid Token' }, { status: 401 });
                }

                console.log('[GET] User identified:', user.id, user.email);

                const { data: userData, error: userFetchError } = await supabaseAdmin
                    .from('users')
                    .select('role')
                    .eq('auth_id', user.id)
                    .single();

                userRole = userData?.role || (user.user_metadata?.role as string) || '';
                const roles = userRole.split(/[,|]/).map(r => r.trim().toUpperCase()).filter(Boolean);

                // Add roles from auth metadata if present
                if (user.user_metadata?.roles && Array.isArray(user.user_metadata.roles)) {
                    user.user_metadata.roles.forEach((r: any) => roles.push(String(r).toUpperCase()));
                }

                // Fetch actual permissions from role_permissions table
                const { data: permsData } = await supabaseAdmin
                    .from('role_permissions')
                    .select('*')
                    .in('role_name', roles);

                const permissions = permsData || [];
                const isAdmin = roles.includes('ADMIN') || roles.includes('ADMINISTRATOR');

                console.log('[GET] User roles/perms:', { roles, permsCount: permissions.length, isAdmin });

                // Helper for server-side check
                const checkPerm = (res: string, act: string) => {
                    if (isAdmin) return true;
                    return (permissions as any[]).some((p: any) => {
                        // Support resource hierarchy e.g. 'ketidakhadiran.izin' matches 'ketidakhadiran'
                        const resMatch = p.resource === '*' || p.resource === res || res.startsWith(p.resource + ':') || res.startsWith(p.resource + '.');
                        const actMatch = p.action === '*' || p.action === act || p.action === 'manage';
                        return resMatch && actMatch && p.is_allowed;
                    });
                };

                const canViewIzin = checkPerm('ketidakhadiran.izin', 'view');
                const canViewSakit = checkPerm('ketidakhadiran.sakit', 'view');

                (global as any).debug_canViewIzin = canViewIzin;
                (global as any).debug_canViewSakit = canViewSakit;

                console.log('[GET] Visibility:', { canViewIzin, canViewSakit });

                // Apply filters if not admin (who sees all)
                if (!isAdmin) {
                    if (canViewIzin && !canViewSakit) {
                        query = query.eq('jenis', 'IZIN');
                    } else if (!canViewIzin && canViewSakit) {
                        query = query.eq('jenis', 'SAKIT');
                    } else if (!canViewIzin && !canViewSakit) {
                        console.warn('[GET] User has NO view permission for Izin or Sakit');
                        return NextResponse.json({ ok: true, data: [] });
                    }
                    // If both, no filter needed (sees all types)
                }
            } else {
                console.warn('[GET] No Authorization header provided');
                // If no auth, we still have a generic query but it will be filtered by RLS if we don't use admin.
                // Since this is a restricted internal API, we might want to return empty or error if no auth.
                // For now, let's keep it as is (admin query) which is DANGEROUS but matches current logic.
                // BETTER: Return empty if no auth.
                return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
            }
        } catch (error: any) {
            console.error('[GET] API Error trace:', error);
            return NextResponse.json({ ok: false, error: 'Internal Server Error during auth' }, { status: 500 });
        }

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
                { ok: false, error: 'Gagal mengambil data ketidakhadiran', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            data: rows,
            debug: {
                userIdentified: !!userRole,
                roles: userRole?.split(/[,|]/).map(r => r.trim().toUpperCase()).filter(Boolean),
                canViewIzin: (global as any).debug_canViewIzin,
                canViewSakit: (global as any).debug_canViewSakit,
                filterApplied: query ? 'yes' : 'no'
            }
        });

    } catch (error: any) {
        console.error('API error:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Internal server error', stack: error.stack },
            { status: 500 }
        );
    }
}
