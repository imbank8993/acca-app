const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function cleanupDuplicates() {
    console.log('Cleaning up duplicate journal slots...');

    // 1. Fetch all records
    const { data } = await supabase
        .from('jurnal_guru')
        .select('id, tanggal, kelas, jam_ke_id, filled_by, created_at')
        .order('created_at', { ascending: false });

    const seen = new Set();
    const toDelete = [];

    data.forEach(row => {
        const key = `${row.tanggal}|${row.kelas}|${row.jam_ke_id}`;
        if (seen.has(key)) {
            // Already have a newer one, delete this one
            toDelete.push(row.id);
        } else {
            seen.add(key);
        }
    });

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicate records...`);
        // Delete in chunks of 50
        for (let i = 0; i < toDelete.length; i += 50) {
            const chunk = toDelete.slice(i, i + 50);
            await supabase.from('jurnal_guru').delete().in('id', chunk);
        }
        console.log('Cleanup finished!');
    } else {
        console.log('No duplicates found.');
    }
}

cleanupDuplicates();
