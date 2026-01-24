
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    raw.split('\n').forEach(l => {
        const m = l.match(/^([^=]+)=(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking siswa_kelas structure...');
    // We can't select * from information_schema via API easily due to permissions usually,
    // but we can try inserting a dummy to see errors or just select * limit 1
    const { data, error } = await supabase.from('siswa_kelas').select('*').limit(1);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Columns likely exist based on data keys:');
        if (data && data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log('Table empty, cannot infer columns from data. Attempting RPC if available or just guessing.');
        }
    }
}

checkSchema();
