
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema(tableName) {
    console.log(`--- Checking ${tableName} table columns ---`);
    const { data: cols, error: selectError } = await supabase.from(tableName).select('*').limit(1);
    if (selectError) {
        console.error(`Error fetching ${tableName}:`, selectError);
    } else if (cols && cols.length > 0) {
        console.log(`Columns found in ${tableName}:`, Object.keys(cols[0]));
    } else {
        console.log(`No rows in ${tableName} to check columns.`);
    }
}

async function run() {
    await checkSchema('absensi_sesi');
    await checkSchema('ketidakhadiran');
}

run();
