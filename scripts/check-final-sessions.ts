
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFinalSessions() {
    console.log('Checking for FINAL sessions...');
    const { data, error } = await supabase
        .from('absensi_sesi')
        .select('*')
        .eq('status_sesi', 'FINAL')
        .limit(10);

    if (error) {
        console.error('Error fetching sessions:', error);
        return;
    }

    console.log(`Found ${data.length} FINAL sessions.`);
    if (data.length > 0) {
        console.log('Sample data:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No FINAL sessions found. Checking DRAFT entries...');
        const { data: drafts } = await supabase
            .from('absensi_sesi')
            .select('*')
            .limit(5);
        console.log(`Found ${drafts?.length} sessions total (DRAFT or otherwise).`);
        if (drafts && drafts.length > 0) {
            console.log('Sample Status:', drafts[0].status_sesi);
        }
    }
}

checkFinalSessions();
