
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function check() {
    console.log('Checking jurnal_tugas_tambahan and their tugas_id...');
    const { data } = await supabase.from('jurnal_tugas_tambahan').select('id, nip, tanggal, tugas_id');
    console.log('Jurnal Tugas:', JSON.stringify(data, null, 2));

    const tugasIds = [...new Set(data.map(d => d.tugas_id))];
    const { data: masterTugas } = await supabase.from('tugas_tambahan').select('id, jabatan').in('id', tugasIds);
    console.log('Master Tugas:', JSON.stringify(masterTugas, null, 2));
}

check();
