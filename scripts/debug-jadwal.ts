
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkJadwal() {
    console.log('--- DEBUG START ---');
    console.log('System Date:', new Date().toString());
    console.log('System Timezone Offset:', new Date().getTimezoneOffset());

    const testDate = new Date('2026-01-26');
    console.log('Test Date (2026-01-26):', testDate.toString());
    console.log('Test Date Day Index:', testDate.getDay()); // 0=Sun, 1=Mon

    const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][testDate.getDay()];
    console.log('Day Name detected:', dayName);

    if (dayName !== 'Senin') {
        console.warn('WARNING: 2026-01-26 should be Senin, but detected as', dayName);
        console.warn('This might be a timezone issue.');
    }

    console.log('\nChecking DB for Senin, Jam 6...');

    // Check master_waktu first
    const { data: waktu, error: waktuError } = await supabase
        .from('master_waktu')
        .select('*')
        .eq('hari', 'Senin')
        .eq('jam_ke', 6);

    if (waktuError) console.error('Error fetching master_waktu:', waktuError.message);
    console.log('Master Waktu (Senin, Jam 6):', waktu?.length, 'records');

    // Check jadwal_guru
    const { data: jadwal, error: jadwalError } = await supabase
        .from('jadwal_guru')
        .select('*')
        .eq('hari', 'Senin')
        .eq('jam_ke', 6);

    if (jadwalError) console.error('Error fetching jadwal_guru:', jadwalError.message);

    console.log('Jadwal Guru (Senin, Jam 6):', jadwal?.length, 'records found.');
    if (jadwal && jadwal.length > 0) {
        console.log('Sample Jadwal:', jadwal[0]);
    } else {
        console.log('No jadwal found for Senin Jam 6.');

        // Check ALL for Monday to see what exists
        const { data: allSenin } = await supabase.from('jadwal_guru').select('jam_ke').eq('hari', 'Senin');
        const jams = allSenin?.map(j => j.jam_ke);
        const uniqueJams = [...new Set(jams)].sort((a, b) => a - b);
        console.log('Available Jam Ke on Senin:', uniqueJams);
    }
    console.log('--- DEBUG END ---');
}

checkJadwal();
