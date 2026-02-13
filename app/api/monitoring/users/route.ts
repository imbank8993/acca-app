import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { corsResponse, handleOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, nama, role, last_seen, foto_profil')
            .order('last_seen', { ascending: false, nullsFirst: false });

        if (error) throw error;

        // Process users to add 'is_online' status
        const now = new Date();
        const processedUsers = users.map((user: any) => {
            let isOnline = false;
            let lastSeenText = 'Belum pernah login';

            if (user.last_seen) {
                const lastSeenDate = new Date(user.last_seen);
                const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 1000 / 60;

                // Consider online if seen within last 5 minutes
                if (diffMinutes <= 5) {
                    isOnline = true;
                }

                // Format friendly text
                if (diffMinutes < 1) lastSeenText = 'Baru saja';
                else if (diffMinutes < 60) lastSeenText = `${Math.floor(diffMinutes)} menit yang lalu`;
                else if (diffMinutes < 1440) lastSeenText = `${Math.floor(diffMinutes / 60)} jam yang lalu`;
                else lastSeenText = lastSeenDate.toLocaleDateString('id-ID');
            }

            return {
                ...user,
                is_online: isOnline,
                last_seen_text: lastSeenText
            };
        });

        return corsResponse(NextResponse.json({
            success: true,
            data: processedUsers
        }));

    } catch (error: any) {
        console.error('Error fetching users:', error);
        return corsResponse(NextResponse.json(
            { error: 'Failed to fetch users', details: error.message },
            { status: 500 }
        ));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
