
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

async function check() {
    const { data: user, error } = await supabase
        .from('users')
        .select('id, username, auth_id, role, created_at')
        .eq('username', 'imrann')
        .single();

    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Username:', user.username);
        console.log('Auth ID:', user.auth_id);
        console.log('Role:', user.role);
    }
}

check();
