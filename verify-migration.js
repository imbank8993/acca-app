const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/"/g, '');
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
    console.log('1. Debugging Table Location...');

    // Check where 'siswa' table actually lives
    const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_schema, table_name, table_type')
        .eq('table_name', 'siswa');

    if (tableError) {
        // fallback if we can't query information_schema directly via client
        console.log('⚠️ Could not query information_schema directly (RLS might block it).');
        console.log('Trying standard select again...');

        const { count, error } = await supabase.from('siswa').select('*', { count: 'exact', head: true });
        if (error) {
            console.error('❌ access failed:', error.message);
        } else {
            console.log(`✅ Table is accessible via client! Row count: ${count}`);
            console.log('If SQL Editor fails, try removing "public." or check if you are in the right project.');
        }
    } else {
        if (tableInfo && tableInfo.length > 0) {
            console.log('✅ Found "siswa" table definition:', tableInfo);
        } else {
            console.error('❌ "siswa" table NOT found in information_schema. Is it a View?');
        }
    }

    console.log('\n2. Verifying Foreign Key Relationship...');

    // Try to select from dokumen_siswa joining with siswa
    const { data, error } = await supabase
        .from('dokumen_siswa')
        .select('*, siswa:nisn(nama_siswa)')
        .limit(1);

    if (error) {
        console.error('❌ foreign key check failed!');
        console.error('Error:', error.message);

        if (error.message.includes('relationship')) {
            console.log('\nDIAGNOSIS: The table "siswa" exists, but the Foreign Key is missing.');
            console.log('Please try the "quoted" version of the SQL script I will provide.');
        }
    } else {
        console.log('✅ Migration verification PASSED! Foreign Key relationship is working.');
    }
}

checkMigration();
