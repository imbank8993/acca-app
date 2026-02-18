
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env for keys
const env = {};
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim();
        }
    });
} catch (e) { console.error('No .env.local'); process.exit(1); }

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('Checking user: imrann');

    // Check public.users
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'imrann') // Check for typo 'imrann' vs 'imran'
        .single();

    if (error) {
        console.log('Public DB Error:', error.message);
        // Try 'imran' just in case
        const { data: user2 } = await supabase.from('users').select('*').eq('username', 'imran').single();
        if (user2) console.log('Found "imran" instead:', user2);
    } else {
        console.log('Found public user:', user);

        if (user.auth_id) {
            // Check Auth User
            const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(user.auth_id);
            if (authError) {
                console.log('Auth check error:', authError.message);
            } else {
                console.log('Auth User Found:', authUser.email, authUser.id);
            }
        } else {
            console.log('WARNING: User has NO auth_id!');
        }
    }
}

check();
