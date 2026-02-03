
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function check() {
    console.log('Checking February journals for Imran...');
    const { data, error } = await supabase.from('jurnal_guru').select('tanggal').eq('nip', '199309082019031013').gte('tanggal', '2026-02-01');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('February Journals:', JSON.stringify(data, null, 2));
}

check();
