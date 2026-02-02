const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env file
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(env.split('\n').filter(line => line.includes('=')).map(l => {
    const [key, ...rest] = l.split('=');
    return [key.trim(), rest.join('=').trim()];
}));

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const migrationPath = 'supabase/migrations/20260202_create_master_tugas_tambahan.sql';
    console.log(`Reading migration from ${migrationPath}...`);

    let migrationSql;
    try {
        migrationSql = fs.readFileSync(migrationPath, 'utf8');
    } catch (e) {
        console.error('Migration file not found.');
        return;
    }

    const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements.`);

    // Try using exec_sql RPC
    let rpcWorks = true;

    // First test if we can run a simple query
    const { error: testError } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });
    if (testError) {
        console.warn(`RPC 'exec_sql' failed or not found: ${testError.message}`);
        console.warn('Attempting to create tables via SQL Editor is recommended if this script fails.');
        rpcWorks = false;
    }

    if (rpcWorks) {
        for (const sql of statements) {
            console.log('Running SQL via RPC...');
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (error) {
                console.error('SQL Execution Error:', error.message);
            } else {
                console.log('Success.');
            }
        }
    } else {
        console.error("Cannot apply migration automatically because 'exec_sql' RPC is missing.");
        console.log("\nPlease run the following SQL in your Supabase SQL Editor:\n");
        console.log(migrationSql);
    }
}

runMigration();
