
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function check() {
    console.log('Checking column types...');
    const { data, error } = await supabase.rpc('get_table_info', { t_name: 'nilai_data' });

    // If RPC doesn't exist, we'll try a raw query if possible or just guess based on sample
    // But wait, Supabase JS doesn't have a direct raw query unless configured.
    // I can try to see if I can query information_schema via regular select? No.

    // Let's just look at the sample data again.
    // "updated_at": "2026-02-03T13:09:40.891+08:00"
    // This is definitely a timestamp with timezone.
}
check();
