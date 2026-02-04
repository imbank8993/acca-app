import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function diagnose() {
    console.log('--- DIAGNOSIS ---');

    // 1. Check total active records
    const { count, error: countError } = await supabase
        .from('ketidakhadiran')
        .select('*', { count: 'exact', head: true })
        .eq('aktif', true);

    if (countError) {
        console.error('Error counting records:', countError);
    } else {
        console.log(`Total active ketidakhadiran records: ${count}`);
    }

    // 2. Sample 5 records
    const { data: sample, error: sampleError } = await supabase
        .from('ketidakhadiran')
        .select('id, jenis, nisn, nama, tgl_mulai, created_at')
        .eq('aktif', true)
        .order('created_at', { ascending: false })
        .limit(5);

    if (sampleError) {
        console.error('Error fetching samples:', sampleError);
    } else {
        console.log('Last 5 records:', JSON.stringify(sample, null, 2));
    }

    // 3. (Optional) Check specific user permissions if auth_id provided
    // For now skip as we don't have the user's UUID easily here.
}

diagnose();
