const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function debug() {
    const env = {};
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('username, role')
        .limit(10);

    if (error) {
        console.log('ERROR:', error);
    } else {
        console.log('USERS:', JSON.stringify(users, null, 2));
    }
}
debug();
