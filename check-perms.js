const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkPermissions() {
    const env = {};
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabaseAdmin
        .from('master_permissions_list')
        .select('*')
        .eq('resource', 'pengaturan_data');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Current permissions for pengaturan_data:');
        console.table(data.map(d => ({ action: d.action, label: d.label })));
    }
}

checkPermissions();
