
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function check() {
    const nip = '199402222020122022'; // Nurmadinah
    console.log(`Checking Jan Jurnal for Nurmadinah...`);

    const { count } = await supabase.from('jurnal_guru').select('*', { count: 'exact', head: true }).eq('nip', nip).gte('tanggal', '2026-01-01').lte('tanggal', '2026-01-31');
    console.log('Jan Jurnal Count:', count);
}

check();
