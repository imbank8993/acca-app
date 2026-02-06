const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const anonKey = 'sb_publishable_xGS9w_p7dFONA-ZjxJSRQQ_y8iPBxFc';
const supabase = createClient(supabaseUrl, anonKey);

async function checkSiswa() {
    console.log('--- Checking siswa_kelas as ANON ---');
    const { data, error } = await supabase.from('siswa_kelas').select('id, nisn, nama_siswa').limit(5);
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Success! Count:', data.length);
        console.log('Sample:', data[0]);
    }

    console.log('\n--- Checking master_guru as ANON ---');
    const { data: gData, error: gError } = await supabase.from('master_guru').select('id, nip, nama_lengkap').limit(5);
    if (gError) {
        console.error('Error:', gError.message);
    } else {
        console.log('Success! Count:', gData.length);
        console.log('Sample:', gData[0]);
    }
}

checkSiswa();
