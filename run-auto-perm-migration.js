const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('Applying Migration: Auto Role Permissions...');

    // 1. Load Env
    const env = {};
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && value) env[key.trim()] = value.join('=').trim();
        });
    }

    const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 2. Read SQL
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260215_auto_role_permissions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 3. Execute
    // Splitting by simple double newline might be risky for functions, but for this specific file it should be okay if we run it as a whole block if possible.
    // However, postgres driver via Supabase might handle multiple statements if using .rpc() or raw query if available.
    // Looking at previous scripts, it seems we might not have a direct 'query' method exposed easily unless we use 'pg' directly or a custom rpc.
    // BUT, usually we can use `supabaseAdmin.rpc('exec_sql', { sql })` if that helper function exists in DB.

    // Let's check if there is an `exec_sql` or similar RPC. If not, we might fall back to splitting.
    // Actually, looking at `run-migration-upsert.js`, it used Supabase JS client to insert data, not run DDL.

    // Alternative: We can try to use a direct PG connection if `pg` is installed.
    // The `package.json` showed `pg": "^8.18.0"`. Great!

    const { Client } = require('pg');

    // Connection string is usually needed. Supabase checks:
    // We need the DB connection string. Usually it's in .env as DATABASE_URL.
    // Let's check env keys.

    let dbUrl = env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not found in .env.local');
        // Construct it if possible? postgres://postgres.[ref]:[password]... 
        // Safer to ask user, but let's see if we can find it.
        // If not, we can try to find a previously used migration runner.
        process.exit(1);
    }

    const client = new Client({
        connectionString: dbUrl,
    });

    try {
        await client.connect();
        await client.query(sql);
        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
