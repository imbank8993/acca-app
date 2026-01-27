import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// POST /api/admin/users/bulk-replace - Bulk replace data across database
export async function POST(request: NextRequest) {
    try {
        // Check if user is admin
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        );

        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from DB to check role
        const { data: dbUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('auth_id', authUser.id)
            .single();

        if (!dbUser || !dbUser.role?.toLowerCase().includes('admin')) {
            return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { table, column, oldValue, newValue, dryRun = true } = body;

        // Validate inputs
        if (!table || !column || !oldValue || !newValue) {
            return NextResponse.json({
                ok: false,
                error: 'Missing required fields: table, column, oldValue, newValue'
            }, { status: 400 });
        }

        // Whitelist allowed tables and columns for security
        const allowedTables = [
            'users',
            'master_guru',
            'master_siswa',
            'master_mapel',
            'master_kelas',
            'guru_mapel',
            'guru_asuh',
            'wali_kelas',
            'siswa_kelas',
            'jadwal_guru'
        ];

        if (!allowedTables.includes(table)) {
            return NextResponse.json({
                ok: false,
                error: `Table '${table}' is not allowed for bulk replace`
            }, { status: 400 });
        }

        // First, find all matching records (preview)
        const { data: matchingRecords, error: searchError } = await supabaseAdmin
            .from(table)
            .select('*')
            .eq(column, oldValue);

        if (searchError) {
            console.error('Error searching for matching records:', searchError);
            return NextResponse.json({
                ok: false,
                error: searchError.message
            }, { status: 500 });
        }

        const affectedCount = matchingRecords?.length || 0;

        // If dry run, just return preview
        if (dryRun) {
            return NextResponse.json({
                ok: true,
                dryRun: true,
                preview: {
                    table,
                    column,
                    oldValue,
                    newValue,
                    affectedCount,
                    affectedRecords: matchingRecords || []
                },
                message: `Found ${affectedCount} record(s) that would be updated`
            });
        }

        // Execute the replacement
        if (affectedCount === 0) {
            return NextResponse.json({
                ok: true,
                dryRun: false,
                affectedCount: 0,
                message: 'No records found to update'
            });
        }

        const { data: updatedRecords, error: updateError } = await supabaseAdmin
            .from(table)
            .update({ [column]: newValue })
            .eq(column, oldValue)
            .select();

        if (updateError) {
            console.error('Error updating records:', updateError);
            return NextResponse.json({
                ok: false,
                error: updateError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            dryRun: false,
            affectedCount: updatedRecords?.length || 0,
            updatedRecords,
            message: `Successfully updated ${updatedRecords?.length || 0} record(s)`
        });
    } catch (error: any) {
        console.error('Error in POST /api/admin/users/bulk-replace:', error);
        return NextResponse.json(
            { ok: false, error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
