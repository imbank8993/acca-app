const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function checkData() {
    console.log('Fetching last 10 jurnal entries...');
    const { data, error } = await supabase
        .from('jurnal_guru')
        .select('id, nip, nama_guru, tanggal, jam_ke_id, kelas, materi, filled_by, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkData();
