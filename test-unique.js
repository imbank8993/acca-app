const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function checkUnique() {
    console.log('Checking for unique constraints on jurnal_guru...');
    // We can try to insert a duplicate to see if it fails
    // This is a test for (tanggal, kelas, jam_ke_id)
    const testData = {
        tanggal: '2026-12-31',
        kelas: 'TEST_UNIQUE',
        jam_ke_id: 99,
        nip: 'TEST_NIP',
        nama_guru: 'TEST_GURU',
        jam_ke: 'Jam Ke-99',
        hari: 'Senin',
        mata_pelajaran: 'TEST_MAPEL'
    };

    console.log('Inserting first...');
    const { error: err1 } = await supabase.from('jurnal_guru').insert(testData);
    if (err1) console.error('Error 1:', err1.message);

    console.log('Inserting second (duplicate)...');
    const { error: err2 } = await supabase.from('jurnal_guru').insert(testData);
    if (err2) {
        console.log('BINGO! Unique constraint exists:', err2.message);
    } else {
        console.log('NO UNIQUE CONSTRAINT. This is the problem! Multiple records can exist for same slot.');
    }

    // Cleanup
    await supabase.from('jurnal_guru').delete().eq('kelas', 'TEST_UNIQUE');
}

checkUnique();
