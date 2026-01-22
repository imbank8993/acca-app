
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value.trim();
            if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value.trim();
        }
    });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Known session ID from previous check
    const sessionId = '1ebb1aa6-2b10-4c01-b74d-7ec7f3c02360';
    console.log(`Checking details for session: ${sessionId}`);

    const { data, error } = await supabase
        .from('absensi_detail')
        .select('*')
        .eq('sesi_id', sessionId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} details.`);
    if (data.length > 0) {
        console.log('Sample detail:', data[0]);
    } else {
        console.log('No details found for this session!');
    }
}

check();
