import { supabaseAdmin } from './supabase-admin';

export async function logActivity(
    userId: string,
    action: string,
    details: string | object | null = null,
    ipAddress: string | null = null
) {
    try {
        const { error } = await supabaseAdmin
            .from('activity_logs')
            .insert({
                user_id: userId,
                action: action,
                details: typeof details === 'object' ? JSON.stringify(details) : details,
                ip_address: ipAddress
            });

        if (error) {
            console.error('Failed to log activity:', error);
        }
    } catch (err) {
        console.error('Error logging activity:', err);
    }
}
