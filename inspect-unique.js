const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function inspectUnique() {
    console.log('Inspecting unique_guru_jam_tanggal...');
    const testData1 = {
        tanggal: '2026-12-31',
        kelas: 'CLASS_A',
        jam_ke_id: 99,
        nip: 'GURU_1',
        nama_guru: 'GURU_1',
        jam_ke: 'Jam Ke-99',
        hari: 'Senin',
        mata_pelajaran: 'MAPEL'
    };

    // Attempt to insert same slot but DIFFERENT NIP
    const testData2 = { ...testData1, nip: 'GURU_2', nama_guru: 'GURU_2', kelas: 'CLASS_A' };

    console.log('Inserting GURU 1 for CLASS A...');
    await supabase.from('jurnal_guru').insert(testData1);

    console.log('Inserting GURU 2 for CLASS A (SAME SLOT)...');
    const { error } = await supabase.from('jurnal_guru').insert(testData2);

    if (error) {
        console.log('Conflict detected on Slot! Error:', error.message);
    } else {
        console.log('NO CONFLICT on Slot when NIP is different. This allows duplicates per Class/Time!');
    }

    // Cleanup
    await supabase.from('jurnal_guru').delete().eq('mata_pelajaran', 'MAPEL');
}

inspectUnique();
