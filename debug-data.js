
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    const nip = '199309082019031013';

    console.log(`\n--- Checking Jadwal Guru for NIP: ${nip} ---`);
    const { data: jadwal, error: jError } = await supabase
        .from('jadwal_guru')
        .select('*')
        .eq('nip', nip);

    if (jError) console.error('Error fetching jadwal:', jError);
    else {
        console.log(`Found ${jadwal.length} jadwal entries.`);
        const classes = [...new Set(jadwal.map(j => j.kelas))];
        console.log('Classes found:', classes);

        for (const k of classes) {
            console.log(`\nChecking siswa for class '${k}' in 'siswa_kelas' table...`);
            // Fixed column name: nama -> nama_siswa
            const { data: siswa, error: sError } = await supabase
                .from('siswa_kelas')
                .select('nisn, nama_siswa, kelas')
                .eq('kelas', k);

            if (sError) console.error(`Error for class ${k}:`, sError.message);
            else {
                console.log(`Found ${siswa.length} students in class '${k}'.`);
                if (siswa.length > 0) console.log('Sample:', siswa[0]);
            }
        }
    }
}

checkData();
