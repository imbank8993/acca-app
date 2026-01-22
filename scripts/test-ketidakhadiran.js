const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('[Setup] Current Dir:', __dirname);
const envPath = path.join(__dirname, '../.env.local');
console.log('[Setup] Targets .env.local at:', envPath);

if (!fs.existsSync(envPath)) {
    console.error('[Setup] CRITICAL: .env.local not found!');
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key && value) {
            process.env[key] = value;
        }
    }
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[Setup] URL:', SUPABASE_URL);
// console.log('[Setup] KEY:', SUPABASE_KEY); // Keep secret

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[Setup] CRITICAL: Missing Env Vars!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testKetidakhadiranFetch() {
    // 1. Fetch all for generic check
    const today = new Date().toISOString().split('T')[0];
    console.log(`Checking for date: ${today}`);

    const { data: allData, error } = await supabase
        .from('ketidakhadiran')
        .select('*')
        .eq('aktif', true)
        .lte('tgl_mulai', today)
        .gte('tgl_selesai', today);

    if (error) {
        console.error('Fetch Error:', error);
        return;
    }

    console.log(`Found ${allData.length} active records for today.`);

    // 2. Check for Ahmad Fauzi
    const targetNisn = '0094638807';
    const found = allData.find(d => d.nisn === targetNisn);

    if (found) {
        console.log('✅ AHMAD FAUZI FOUND:', found);
    } else {
        console.log('❌ AHMAD FAUZI NOT FOUND in active records.');

        // Check if he exists but maybe date mismatch?
        const { data: anyData } = await supabase
            .from('ketidakhadiran')
            .select('*')
            .eq('nisn', targetNisn);

        console.log('History for Ahmad Fauzi:', anyData);
    }
}

testKetidakhadiranFetch();
