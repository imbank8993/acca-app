const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkTable() {
    const env = {};
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('Attempting test upsert with select...');
    const payload = {
        role_name: 'TEST_ROLE',
        resource: 'TEST_RES',
        action: 'TEST_ACT',
        is_allowed: true
    };

    const { data, error } = await supabase
        .from('role_permissions')
        .upsert(payload, { onConflict: 'role_name,resource,action' })
        .select();

    if (error) {
        console.error('Upsert Error:', error);
    } else {
        console.log('Upsert result:', data);
    }

    // Cleanup
    await supabase.from('role_permissions').delete().eq('role_name', 'TEST_ROLE');
}
checkTable();
