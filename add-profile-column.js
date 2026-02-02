
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
    console.log('Adding foto_profil column to users table...');
    const { error } = await supabase.rpc('exec_sql', {
        sql_query: "ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_profil TEXT;"
    });

    if (error) {
        console.error('Error adding column:', error);
        // Fallback: If exec_sql is not available or fails, we might need another way, 
        // but for now let's hope it works.
    } else {
        console.log('Success: foto_profil column added or already exists.');
    }
}

updateSchema();
