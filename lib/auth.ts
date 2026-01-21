// Authentication helper functions

import { supabase } from './supabase';
import type { User, PageNode } from './types';

/**
 * Parse role string into array
 * Supports: "GURU,KAMAD" or "GURU|KAMAD"
 */
export function parseRoles(roleStr: string): string[] {
    if (!roleStr) return [];

    const parts = roleStr
        .split(/[,|]/)
        .map(r => r.trim().toUpperCase())
        .filter(Boolean);

    return [...new Set(parts)]; // Remove duplicates
}

/**
 * Parse pages string into array and tree structure
 * Format: "Dashboard,User,Laporan>ExportJurnal|ExportAbsensi"
 * Also supports legacy format with Unicode checkbox symbols: "☑Page1☐Page2"
 */
export function parsePages(pagesStr: string): {
    pagesArray: string[];
    pagesTree: PageNode[];
} {
    if (!pagesStr) return { pagesArray: [], pagesTree: [] };

    // Clean Unicode symbols that might be used as prefixes
    // Remove: ☑ ☐ 📊 📋 🔧 ↓ 📣 🎓 👥 ⊗ and other common emoji/symbols
    let cleanedStr = pagesStr.replace(/[☑☐📊📋🔧↓📣🎓👥⊗🎯📈📉✓✔️❌⚠️📌📍🔔🔕]/g, '');

    // Replace Unicode checkbox symbols with comma if they're being used as separators
    // This handles legacy format where ☐ was used instead of comma
    cleanedStr = cleanedStr.replace(/[\u2610\u2611\u2612]/g, ',');

    // Split by comma and clean up
    const tokens = cleanedStr.split(',').map(s => s.trim()).filter(Boolean);
    const tree: PageNode[] = [];
    const flatPages: string[] = [];

    tokens.forEach(token => {
        // Check if it's a parent with children (contains ">")
        if (token.includes('>')) {
            const [parentTitle, childrenStr] = token.split('>');
            const parent = parentTitle.trim();

            if (!parent) return;

            const children: PageNode[] = [];
            const childTokens = childrenStr.split('|').map(s => s.trim()).filter(Boolean);

            childTokens.forEach(childToken => {
                // Support "Label=Page" format
                if (childToken.includes('=')) {
                    const [label, page] = childToken.split('=');
                    const title = label.trim();
                    const pageName = page.trim();

                    if (title && pageName) {
                        children.push({ title, page: pageName, children: [] });
                        flatPages.push(pageName);
                    }
                } else {
                    // Simple format: just page name
                    children.push({ title: childToken, page: childToken, children: [] });
                    flatPages.push(childToken);
                }
            });

            if (children.length > 0) {
                tree.push({ title: parent, page: null, children });
            }
        } else {
            // Simple page (no children)
            if (token.includes('=')) {
                const [label, page] = token.split('=');
                const title = label.trim();
                const pageName = page.trim();

                if (title && pageName) {
                    tree.push({ title, page: pageName, children: [] });
                    flatPages.push(pageName);
                }
            } else {
                tree.push({ title: token, page: token, children: [] });
                flatPages.push(token);
            }
        }
    });

    return {
        pagesArray: [...new Set(flatPages)], // Remove duplicates
        pagesTree: tree
    };
}

/**
 * Build full user object from database row
 */
export function buildUserObject(dbUser: any): User {
    const roles = parseRoles(dbUser.role || '');
    const { pagesArray, pagesTree } = parsePages(dbUser.pages || '');

    return {
        id: dbUser.id,
        auth_id: dbUser.auth_id || null,
        username: dbUser.username || '',
        guruId: dbUser.guru_id || dbUser.guruId || dbUser.username || '',
        nama: dbUser.nama || 'User',
        role: dbUser.role || '',
        roles,
        divisi: dbUser.divisi || '',
        pages: dbUser.pages || '',
        pagesArray,
        pagesTree,
        aktif: dbUser.aktif === true || dbUser.aktif === 'true' || dbUser.aktif === 'ya',
        photoUrl: dbUser.photoUrl || null
    };
}

/**
 * Get user data by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('username', username)
            .single();

        if (error || !data) return null;

        return buildUserObject(data);
    } catch (e) {
        console.error('getUserByUsername error:', e);
        return null;
    }
}

/**
 * Get user data by auth_id
 */
export async function getUserByAuthId(authId: string): Promise<User | null> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', authId)
            .single();

        if (error || !data) return null;

        return buildUserObject(data);
    } catch (e) {
        console.error('getUserByAuthId error:', e);
        return null;
    }
}

/**
 * Check if user has specific role
 */
export function userHasRole(user: User, role: string): boolean {
    return user.roles.includes(role.toUpperCase());
}

/**
 * Check if user has any of the specified roles
 */
export function userHasAnyRole(user: User, roles: string[]): boolean {
    const userRoles = new Set(user.roles);
    return roles.some(r => userRoles.has(r.toUpperCase()));
}

/**
 * Check if user has access to a specific page
 */
export function userHasPageAccess(user: User, page: string): boolean {
    return user.pagesArray.includes(page);
}
