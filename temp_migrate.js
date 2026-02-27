const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic env parser
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Running migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_location VARCHAR(255);'
    });

    if (error) {
        console.error('Migration failed:', error);
        // If exec_sql doesn't exist, we might need another way or just hope for the best if RLS allows
        process.exit(1);
    }

    console.log('Migration successful:', data);
}

migrate();
