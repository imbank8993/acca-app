
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        console.log('🚀 Migrating Laporan Piket...');
        const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260205_create_laporan_piket_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by statement manually slightly risky but exec_sql works usually
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Migration Error:', error);
        } else {
            console.log('✅ Migration Success');
        }
    } catch (e) {
        console.error('💥 Error:', e);
    }
}

run();
