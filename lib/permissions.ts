import { supabaseAdmin } from './supabase-admin';
import { matchResource, matchAction, hasPermission } from './permissions-client';

export { hasPermission };

/**
 * Checks if a user (or their roles) has permission to perform an action on a resource.
 * SERVER SIDE ONLY (Uses supabaseAdmin)
 */
export async function checkPermission(userRoles: string[], resource: string, action: string): Promise<boolean> {
    if (!userRoles || userRoles.length === 0) return false;

    // 1. Admin always has full access (God Mode)
    if (userRoles.some(r => r.toUpperCase() === 'ADMIN')) return true;

    try {
        // Fetch permissions for all roles the user has
        const { data: permissions, error } = await supabaseAdmin
            .from('role_permissions')
            .select('*')
            .in('role_name', userRoles);

        if (error || !permissions) return false;

        // Check if any permission matches
        return permissions.some(p => {
            return matchResource(resource, p.resource) &&
                matchAction(action, p.action) &&
                p.is_allowed;
        });
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}
