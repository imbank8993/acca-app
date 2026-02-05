
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env
try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2 && !line.startsWith('#')) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            process.env[key] = val;
        }
    });
} catch (e) { }

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('informasi_akademik')
        .select('category, title');

    if (error) {
        console.error(error);
        return;
    }

    const counts = {};
    data.forEach(d => {
        counts[d.category] = (counts[d.category] || 0) + 1;
    });
    console.log('Categories found:', counts);
    console.log('Sample content:', data.slice(0, 5));
}

check();
