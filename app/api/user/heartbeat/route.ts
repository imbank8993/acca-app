import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server'; // Use server client helper if available, or create new
import { supabaseAdmin } from '@/lib/supabase-admin'; // Use admin for update to avoid RLS issues on users table if strict
import { corsResponse, handleOptions } from '@/lib/cors';

export async function POST(request: NextRequest) {
    try {
        // We need to identify the user. 
        // If using standard supabase auth cookie:
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return corsResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        }

        // Extract location from body
        let location = 'Dashboard';
        try {
            const body = await request.json();
            if (body.location) location = body.location;
        } catch (e) {
            // Fallback if body is empty or invalid
        }

        // Update public.users based on auth_id
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                last_seen: new Date().toISOString(),
                last_location: location
            })
            .eq('auth_id', user.id);

        if (updateError) {
            console.error('Error updating last_seen:', updateError);
            return corsResponse(NextResponse.json({ error: 'Database Update Failed' }, { status: 500 }));
        }

        return corsResponse(NextResponse.json({ success: true }));

    } catch (error: any) {
        console.error('Heartbeat error:', error);
        return corsResponse(NextResponse.json({ error: 'Internal Server Error' }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return handleOptions();
}
