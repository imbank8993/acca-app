const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function checkConstraints() {
    const env = {};
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Attempting to find unique index via SQL if possible (hacky way)
    // Since we don't have direct SQL, let's just try to insert duplicate and see if it errors
    console.log('Testing duplicate constraint...');
    const payload = {
        role_name: 'TEST_X',
        resource: 'RES_X',
        action: 'ACT_X',
        is_allowed: true
    };

    await supabase.from('role_permissions').insert(payload);
    const { error } = await supabase.from('role_permissions').insert(payload);

    if (error && error.code === '23505') {
        console.log('Success: Duplicate caught by unique constraint.');
    } else if (!error) {
        console.log('Warning: Duplicate was allowed! Table missing unique constraint.');
    } else {
        console.log('Error during test:', error);
    }

    // Cleanup
    await supabase.from('role_permissions').delete().eq('role_name', 'TEST_X');
}
checkConstraints();
