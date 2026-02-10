const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkColumns() {
    const env = {};
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('master_permissions_list').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('Columns master_permissions_list:', Object.keys(data[0]));
    }

    const { data: data2, error: error2 } = await supabase.from('role_permissions').select('*').limit(1);
    if (data2 && data2.length > 0) {
        console.log('Columns role_permissions:', Object.keys(data2[0]));
    } else {
        // Let's look at the table definition if we can't get keys from row
        console.log('role_permissions is empty.');
    }
}
checkColumns();
