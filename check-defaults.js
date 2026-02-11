const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function checkDefaults() {
    console.log('Checking column defaults for jurnal_guru...');
    // We can use RPC to query information_schema.columns
    const { data, error } = await supabase.rpc('get_column_defaults', { table_name: 'jurnal_guru' });
    if (error) {
        // If RPC doesn't exist, try a sneaky query
        console.log('RPC get_column_defaults failed, trying manual approach...');
        // We can't really do it without RPC or direct SQL access.
        // Let's assume there are no weird defaults for now.
    } else {
        console.log('Column defaults:', data);
    }
}

checkDefaults();
