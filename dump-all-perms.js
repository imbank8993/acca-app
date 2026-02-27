const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function dump() {
    const env = {};
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('--- ROLE PERMISSIONS ---');
    const { data: perms } = await supabaseAdmin.from('role_permissions').select('*');
    console.table(perms);

    console.log('--- MASTER PERMISSIONS LIST ---');
    const { data: master } = await supabaseAdmin.from('master_permissions_list').select('*');
    console.table(master);

    console.log('--- USERS (ROLE & PAGES) ---');
    const { data: users } = await supabaseAdmin.from('users').select('username, role, pages');
    console.table(users);
}

dump();
