export interface Permission {
    role_name: string;
    resource: string;
    action: string;
}

/**
 * Helper to match resource with support for wildcards and hierarchy (resource:subresource)
 */
export function matchResource(required: string, possessed: string): boolean {
    if (possessed === '*') return true;
    if (possessed === required) return true;

    // Parent covers child: if user has 'ketidakhadiran', they can access 'ketidakhadiran:IZIN' or 'ketidakhadiran.izin'
    if (required.startsWith(possessed + ':')) return true;
    if (required.startsWith(possessed + '.')) return true;

    return false;
}

/**
 * Helper to match action with support for wildcards
 */
export function matchAction(required: string, possessed: string): boolean {
    if (possessed === '*') return true;
    if (possessed === 'manage') return true; // manage implies all other actions (view, create, etc)
    return possessed === required;
}

/**
 * Client-side version of permission check (uses cache or local evaluation)
 * This is meant to be called in components.
 */
export function hasPermission(userPermissions: any[], resource: string, action: string, isAdmin: boolean = false): boolean {
    if (isAdmin) return true;
    if (action === 'view') return true; // VISIBILITY BY DEFAULT: Allow everyone to view
    if (!userPermissions) return false;

    return userPermissions.some(p => {
        return matchResource(resource, p.resource) &&
            matchAction(action, p.action) &&
            p.is_allowed;
    });
}
