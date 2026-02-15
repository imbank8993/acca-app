
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function logActivity(
    userId: string | undefined, // Allow undefined, handle inside
    action: string,
    details: any = null,
    req?: Request // Optional, to get IP if needed
) {
    if (!userId) return; // Can't log without user

    try {
        let ipAddress = null;
        if (req) {
            ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
        }

        const { error } = await supabaseAdmin
            .from('activity_logs')
            .insert({
                user_id: userId,
                action,
                details: JSON.stringify(details),
                ip_address: ipAddress
            });

        if (error) {
            console.error('Failed to log activity:', error);
        }
    } catch (err) {
        console.error('Error logging activity:', err);
    }
}
