import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // 1. Fetch activity logs
        const { data: logs, error } = await supabaseAdmin
            .from('activity_logs')
            .select(`
                id,
                action,
                details,
                created_at,
                user_id
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // 2. Fetch user details manually (since join might fail if FK is missing)
        if (logs && logs.length > 0) {
            const userIds = Array.from(new Set(logs.map(log => log.user_id).filter(id => id)));

            if (userIds.length > 0) {
                const { data: users, error: userError } = await supabaseAdmin
                    .from('users')
                    .select('auth_id, nama, role, foto_profil')
                    .in('auth_id', userIds);

                if (!userError && users) {
                    const userMap = new Map(users.map(u => [u.auth_id, u]));

                    // Merge user data into logs
                    const logsWithUser = logs.map(log => ({
                        ...log,
                        users: userMap.get(log.user_id) || { nama: 'Unknown', role: 'Unknown', foto_profil: null }
                    }));

                    return corsResponse(NextResponse.json({
                        success: true,
                        data: logsWithUser
                    }));
                }
            }
        }

        return corsResponse(NextResponse.json({
            success: true,
            data: logs
        }));

    } catch (error: any) {
        console.error('Error fetching activity logs:', error);
        return corsResponse(NextResponse.json(
            { error: 'Failed to fetch logs', details: error.message },
            { status: 500 }
        ));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
