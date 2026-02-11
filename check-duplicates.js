const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function checkDuplicates() {
    console.log('Fetching recent jurnal data...');
    const { data, error } = await supabase
        .from('jurnal_guru')
        .select('id, tanggal, kelas, jam_ke_id')
        .gte('tanggal', '2026-02-01');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const counts = {};
    const dups = [];
    data.forEach(row => {
        const key = `${row.tanggal}|${row.kelas}|${row.jam_ke_id}`;
        if (!counts[key]) counts[key] = [];
        counts[key].push(row.id);
        if (counts[key].length === 2) {
            dups.push(key);
        }
    });

    if (dups.length > 0) {
        console.log('Found duplicate slots:');
        dups.forEach(key => {
            console.log(`${key} -> IDs: ${counts[key].join(', ')}`);
        });
    } else {
        console.log('No duplicates found.');
    }
}

checkDuplicates();
