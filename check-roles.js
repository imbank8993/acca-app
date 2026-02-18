const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim();
        }
    });
} catch (e) { }

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: user } = await supabase.from('users').select('*').eq('username', 'imrann').single();
    console.log('User roles:', user?.role);
}

main();
