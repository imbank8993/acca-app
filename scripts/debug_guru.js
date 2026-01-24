
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, '../.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    raw.split(/\r?\n/).forEach(l => {
        const m = l.match(/^([^=]+)=(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('No keys'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNIP() {
    console.log('--- Debug Guru NIP ---');
    const targetNIP = 'G-IC-003';

    console.log(`Searching for '${targetNIP}'...`);

    // 1. Exact Match
    const { data: exact, error: err1 } = await supabase
        .from('master_guru')
        .select('id, nip, nama_lengkap')
        .eq('nip', targetNIP);

    if (err1) console.error('Error exact:', err1.message);
    console.log('Exact Match Count:', exact?.length || 0);
    if (exact?.length) console.log(exact);

    // 2. Like Search
    const { data: like, error: err2 } = await supabase
        .from('master_guru')
        .select('id, nip, nama_lengkap')
        .ilike('nip', `%${targetNIP}%`);

    if (err2) console.error('Error like:', err2.message);
    console.log(`Like '%${targetNIP}%' Count:`, like?.length || 0);
    if (like?.length) console.log(like);

    // 3. Show first 5 gurus to see format
    console.log('\nSample Data (First 5):');
    const { data: sample } = await supabase.from('master_guru').select('nip, nama_lengkap').limit(5);
    console.log(sample);
}

checkNIP();
