
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

async function reset() {
    const { data: user } = await supabase.from('users').select('auth_id').eq('username', 'imrann').single();
    if (!user || !user.auth_id) {
        console.log('User not found or no auth_id');
        return;
    }

    console.log('Resetting password for auth_id:', user.auth_id);
    const { error } = await supabase.auth.admin.updateUserById(
        user.auth_id,
        { password: 'imrann' }
    );

    if (error) {
        console.log('Error resetting password:', error.message);
    } else {
        console.log('Password reset to "imrann" successfully!');
    }
}

reset();
