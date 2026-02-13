import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Join with users table to get names
        const { data: logs, error } = await supabaseAdmin
            .from('activity_logs')
            .select(`
                id,
                action,
                details,
                created_at,
                user_id,
                users (
                    nama,
                    role,
                    foto_profil
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50); // Limit to last 50 logs for now

        if (error) throw error;

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
