const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const http = require('http');

// 1. Load Env
const env = {};
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim();
        }
    });
} catch (e) { console.error('Env error', e); }

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // 2. Get User
    const { data: user, error } = await supabase.from('users').select('*').eq('username', 'imrann').single();

    if (error || !user) {
        console.error('User imrann not found');
        return;
    }

    const nip = user.nip || user.guru_id || user.username;
    console.log(`Testing with NIP: ${nip}`);

    // 3. Hit API
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/scopes?nip=${encodeURIComponent(nip)}`,
        method: 'GET',
    };

    console.log(`Requesting: http://localhost:3000${options.path}`);

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        let data = '';

        res.on('data', chunk => data += chunk);

        res.on('end', () => {
            console.log('BODY START:');
            console.log(data.substring(0, 500));
            try {
                JSON.parse(data);
                console.log('JSON PARSE: SUCCESS');
            } catch (e) {
                console.log('JSON PARSE: FAILED');
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Request error: ${e.message}`);
    });

    req.end();
}

main();
