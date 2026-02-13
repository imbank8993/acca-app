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

        // Update last_seen in public.users (or auth.users if you have a trigger syncing them, but usually we extend in public.users)
        // Assuming public.users has auth_id or id matching auth.uid()

        // Option 1: Update public.users based on auth_id
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', user.id); // Assuming 'id' in public.users is the UUID from auth

        if (updateError) {
            // If id mismatch (maybe integer id?), try auth_id column if exists
            console.error('Error updating last_seen:', updateError);
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
