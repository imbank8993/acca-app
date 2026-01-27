
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicates() {
    console.log('--- Checking for duplicate NISNs in siswa_kelas ---');

    // We can group by nisn, kelas and count > 1
    // But supabase-js doesn't support complex group by easily.
    // We'll fetch all and check in JS for a specific class (XI C) or all.

    const { data: siswa, error } = await supabase
        .from('siswa_kelas')
        .select('nisn, kelas, nama_siswa');

    if (error) {
        console.error('Error fetching siswa_kelas:', error);
        return;
    }

    const map = new Map();
    let duplicates = 0;

    siswa.forEach(s => {
        const key = `${s.kelas}||${s.nisn}`;
        if (map.has(key)) {
            console.log(`DUPLICATE FOUND: Class ${s.kelas}, NISN ${s.nisn}, Name: ${s.nama_siswa}`);
            duplicates++;
        } else {
            map.set(key, true);
        }
    });

    if (duplicates === 0) {
        console.log('No duplicates found in siswa_kelas (unique class+nisn).');
    } else {
        console.log(`Found ${duplicates} duplicates.`);
    }

    // Also check absensi_detail for any weirdness
    console.log('\n--- Checking absensi_detail count ---');
    const { count, error: cError } = await supabase
        .from('absensi_detail')
        .select('*', { count: 'exact', head: true });

    if (cError) console.error(cError);
    else console.log(`Total rows in absensi_detail: ${count}`);
}

checkDuplicates();
