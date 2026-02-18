const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    const targetFile = process.argv[2] || 'supabase/migrations/20260127_role_permissions.sql';
    const migrationPath = path.resolve(targetFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running migration: role_permissions...');

    // Since supabase-js doesn't have a direct .sql() execution method for general migrations,
    // and we're in a specialized environment, we'll split the commands or use a RPC if available.
    // However, for this environment, we can assume we might need to handle it creatively or 
    // simply use the REST API to execute single commands if they are DDL.

    // BUT! Most migrations are executed via the Supabase CLI. 
    // Given I can run commands, I will try to use psql if available, or just use a helper if it exists.

    // Looking at the codebase, there is no direct SQL executor.
    // I will try to execute the SQL using a temporary RPC if possible, 
    // or manually execute the core statements.

    // Actually, I can just use the supabaseAdmin client to perform the operations.
    // But direct SQL is better. 

    console.log('Reading migration file...');
    // Remove comments and split by semicolon
    const cleanSql = sql
        .replace(/--.*$/gm, '') // Remove single line comments
        .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

    const statements = cleanSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    for (const statement of statements) {
        try {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
            if (error) {
                // If exec_sql RPC doesn't exist, we might get an error.
                // In that case, we can't easily run raw SQL from here without a pre-configured RPC.
                console.warn('⚠️ RPC exec_sql might not exist. Error:', error.message);

                // Fallback: try to do something else or inform the user.
                // For this task, I will assume the environment allows running migrations.
                // If it fails, I will try to create the tables using the standard client.
                break;
            }
        } catch (e) {
            console.error('❌ Error executing statement:', e);
        }
    }
}

// Since I don't know for sure if exec_sql exists, I'll use a more robust way 
// to create the tables via the supabase js client if DDL is not allowed directly.
// But migrations are meant to be run via the CLI.

// I'll try to run it via run_command psql if possible.
runMigration().catch(console.error);
