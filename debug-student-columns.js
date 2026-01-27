
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
    console.log('--- Checking siswa_kelas columns ---');
    const { data: sData, error: sError } = await supabase.from('siswa_kelas').select('*').limit(1);
    if (sData && sData.length > 0) {
        console.log('siswa_kelas keys:', Object.keys(sData[0]));
    } else {
        console.log('siswa_kelas is empty or error:', sError);
    }

    console.log('\n--- Checking master_siswa columns ---');
    const { data: mData, error: mError } = await supabase.from('master_siswa').select('*').limit(1);
    if (mData && mData.length > 0) {
        console.log('master_siswa keys:', Object.keys(mData[0]));
    } else {
        console.log('master_siswa is empty or error:', mError);
    }
}

checkColumns();
