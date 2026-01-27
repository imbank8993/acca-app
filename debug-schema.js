
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('--- Checking absensi_detail columns ---');
    // Attempt to select one row to infer columns, or if empty, userpc if available, but simplest is to insert a dummy and see error or just list keys from a select if data exists
    const { data, error } = await supabase.from('absensi_detail').select('*').limit(1);

    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('Table empty or error:', error);
        // If table is empty, we can try to insert a dummy record that we know will fail constraints, 
        // but return the structure? No, that's hard.
        // Let's rely on finding migration files.
    }
}

checkSchema();
