const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(env.split('\n').map(l => l.split('=')).filter(p => p.length === 2));

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL.trim();
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const migrationSql = fs.readFileSync('supabase/migrations/20260202_create_master_tahun_ajaran.sql', 'utf8');

    // Split by semicolon but handle potential issues
    const statements = migrationSql.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const sql of statements) {
        console.log('Running:', sql.substring(0, 50) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error('Failed to run migration via RPC exec_sql:', error.message);
            console.log('Falling back to manual instruction.');
            return;
        }
    }
    console.log('Migration completed successfully!');
}

runMigration();
