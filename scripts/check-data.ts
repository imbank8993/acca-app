// Script to check table data
import { supabaseAdmin } from './lib/supabase-admin';

async function checkData() {
    console.log('--- CHECKING MASTER_KELAS ---');
    const { data: kelas, error: errKelas } = await supabaseAdmin
        .from('master_kelas')
        .select('*')
        .limit(3);

    if (errKelas) console.error(errKelas);
    else console.log(JSON.stringify(kelas, null, 2));

    console.log('\n--- CHECKING MASTER_WAKTU ---');
    const { data: waktu, error: errWaktu } = await supabaseAdmin
        .from('master_waktu')
        .select('*')
        .limit(3);

    if (errWaktu) console.error(errWaktu);
    else console.log(JSON.stringify(waktu, null, 2));
}

checkData();
