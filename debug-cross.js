
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function check() {
    console.log('Searching for Nurmadinah in all tables...');
    const name = 'Nurmadinah';

    const { data: j } = await supabase.from('jurnal_guru').select('nip, nama_guru').ilike('nama_guru', `%${name}%`).limit(1);
    const { data: n } = await supabase.from('nilai_data').select('nip').limit(5); // check if there's any odd NIP

    console.log('Jurnal result:', j);
    // console.log('Nilai summary:', n);
}

check();
