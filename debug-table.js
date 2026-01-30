const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(env.split('\n').map(l => l.split('=')).filter(p => p.length === 2));

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL.trim();
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    const { data, error } = await supabase.from('master_tahun_ajaran').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Data:', data);
    }
}

checkTable();
