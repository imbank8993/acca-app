const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function dumpMasterPermissions() {
    let env = {};
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
    }

    const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabaseAdmin
        .from('master_permissions_list')
        .select('*')
        .order('category', { ascending: true })
        .order('resource', { ascending: true });

    if (error) {
        console.error('Error fetching master permissions:', error);
        return;
    }

    console.log('START_DATA');
    console.log(JSON.stringify(data, null, 2));
    console.log('END_DATA');
}

dumpMasterPermissions();
