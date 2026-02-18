
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
// Service Role Key from .env.local
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName) {
    console.log(`--- Inspecting ${tableName} ---`);
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (error) {
        console.error(`Error inspecting ${tableName}:`, error.message);
    } else if (data && data.length > 0) {
        console.log(`Columns for ${tableName}:`, Object.keys(data[0]));
        // console.log('Sample Data:', data[0]);
    } else {
        // If empty, try to insert a dummy (transaction rolled back) or just assume it exists but is empty? 
        // Or check if we can get metadata.
        console.log(`Table ${tableName} exists but is empty or returned no rows.`);
    }
}

async function listTables() {
    // This might not work if rpc is not set up, but let's try just standard tables
    const tables = ['siswa', 'dokumen_siswa', 'kelas', 'rombel', 'master_kelas', 'data_siswa'];
    for (const t of tables) {
        await inspectTable(t);
    }
}

listTables();
