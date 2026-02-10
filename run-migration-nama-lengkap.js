
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function runMigration() {
    console.log('Adding nama_lengkap column...');
    const { error } = await supabase.rpc('run_sql', {
        sql_query: `
            ALTER TABLE users ADD COLUMN IF NOT EXISTS nama_lengkap TEXT;
            UPDATE users SET nama_lengkap = nama WHERE nama_lengkap IS NULL;
        `
    });

    if (error) {
        console.error('Migration failed:', error);
        // Fallback: Try running column addition separately if rpc is not available
        console.log('Trying direct query (if rpc fails)...');
    } else {
        console.log('Migration successful!');
    }
}

runMigration();
