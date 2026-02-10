const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function setAdminAll() {
    const env = {};
    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.join('=').trim();
            }
        });
    } catch (e) {
        console.error('Cannot read .env.local');
        return;
    }

    const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Get all roles that are "ADMIN" or variants
    const { data: roles, error: rolesError } = await supabaseAdmin
        .from('roles')
        .select('*');

    if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
    }

    const adminRoles = roles.filter(r =>
        r.name.toUpperCase() === 'ADMIN' ||
        r.name.toLowerCase() === 'admin'
    );

    if (adminRoles.length === 0) {
        console.log('No "ADMIN" role found in roles table. Looking for existing permissions for role names like "ADMIN"...');
    }

    // Role names to apply wildcard to
    const targetRoleNames = ['ADMIN', 'Admin'];
    // Merge with any found in database
    adminRoles.forEach(r => {
        if (!targetRoleNames.includes(r.name)) targetRoleNames.push(r.name);
    });

    console.log(`Setting full access for roles: ${targetRoleNames.join(', ')}`);

    const upserts = targetRoleNames.map(roleName => ({
        role_name: roleName,
        resource: '*',
        action: '*',
        is_allowed: true
    }));

    const { data, error } = await supabaseAdmin
        .from('role_permissions')
        .upsert(upserts, { onConflict: 'role_name,resource,action' });

    if (error) {
        console.error('Error setting permissions:', error);
    } else {
        console.log('Success! Role(s) updated with full access wildcard (*).');
    }
}

setAdminAll();
