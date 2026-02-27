const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('--- Checking informasi_akademik ---');
    const { data: infoData, error: infoError } = await supabase
        .from('informasi_akademik')
        .select('*')
        .limit(1);

    if (infoError) {
        console.error('Error fetching informasi_akademik:', infoError.message);
    } else {
        console.log('informasi_akademik exists.');
    }

    console.log('\n--- Checking testimonials ---');
    const { data: testData, error: testError } = await supabase
        .from('testimonials')
        .select('*')
        .limit(1);

    if (testError) {
        console.error('Error fetching testimonials:', testError.message);
    } else {
        console.log('testimonials exists.');
    }
}

checkTables();
