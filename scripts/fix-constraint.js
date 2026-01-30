const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function fixUniqueConstraint() {
    const envPath = path.join(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = Object.fromEntries(
        envContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(line => line.split('='))
            .filter(parts => parts.length >= 2)
            .map(parts => [parts[0].trim(), parts.slice(1).join('=').trim()])
    );

    const supabase = createClient(
        envVars.NEXT_PUBLIC_SUPABASE_URL,
        envVars.SUPABASE_SERVICE_ROLE_KEY
    );

    const sql = `
    -- 1. Drop the old unique constraint on just tahun_ajaran if it exists
    ALTER TABLE IF EXISTS master_tahun_ajaran 
    DROP CONSTRAINT IF EXISTS master_tahun_ajaran_tahun_ajaran_key;

    -- 2. Add new unique constraint on (tahun_ajaran, semester)
    -- This allows "2024/2025" Ganjil and "2024/2025" Genap to coexist.
    ALTER TABLE IF EXISTS master_tahun_ajaran
    ADD CONSTRAINT master_tahun_ajaran_tahun_semester_key UNIQUE (tahun_ajaran, semester);
  `;

    console.log('Running SQL to fix unique constraint...');

    // Note: This requires the exec_sql RPC to be present in Supabase.
    // If not present, this will fail.
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error('Error executing SQL via RPC:', error);
            process.exit(1);
        }
        console.log('Successfully updated constraints.');
    } catch (err) {
        console.error('Failed to call RPC:', err);
        process.exit(1);
    }
}

fixUniqueConstraint();
