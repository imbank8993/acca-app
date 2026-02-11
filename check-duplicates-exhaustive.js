const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function checkDuplicates() {
    console.log('Checking for duplicates in jurnal_guru slot (tanggal, kelas, jam_ke_id)...');

    const { data, error } = await supabase
        .from('jurnal_guru')
        .select('id, tanggal, kelas, jam_ke_id, materi, filled_by, updated_at')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    const slots = {};
    const duplicates = [];

    data.forEach(row => {
        const key = `${row.tanggal}|${row.kelas}|${row.jam_ke_id}`;
        if (!slots[key]) {
            slots[key] = [];
        }
        slots[key].push(row);
        if (slots[key].length > 1) {
            if (!duplicates.includes(key)) duplicates.push(key);
        }
    });

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate slots!`);
        duplicates.slice(0, 5).forEach(key => {
            console.log(`Slot: ${key}`);
            slots[key].forEach(r => {
                console.log(`  - ID: ${r.id}, By: ${r.filled_by}, Updated: ${r.updated_at}, Materi: ${r.materi?.substring(0, 20)}`);
            });
        });
    } else {
        console.log('No duplicate slots found. Total records:', data.length);
    }
}

checkDuplicates();
