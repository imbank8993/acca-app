
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    raw.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let val = match[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            env[match[1].trim()] = val;
        }
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars in .env.local');
    // Fallback: Try process.env if running in environment where they are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNISN() {
    const targetNISN = '0089188239';
    const unpaddedNISN = '89188239';

    console.log(`Checking for NISN: ${targetNISN} and ${unpaddedNISN}...`);

    // 1. Check Exact Padded
    const { data: padded, error: err1 } = await supabase
        .from('master_siswa')
        .select('*')
        .eq('nisn', targetNISN);

    if (err1) console.error('Error querying padded:', err1.message);
    console.log(`Found Padded (${targetNISN}):`, padded?.length || 0);
    if (padded?.length > 0) console.log('Match:', padded[0].nama_lengkap);

    // 2. Check Unpadded
    const { data: unpadded, error: err2 } = await supabase
        .from('master_siswa')
        .select('*')
        .eq('nisn', unpaddedNISN);

    if (err2) console.error('Error querying unpadded:', err2.message);
    console.log(`Found Unpadded (${unpaddedNISN}):`, unpadded?.length || 0);
    if (unpadded?.length > 0) console.log('Match:', unpadded[0].nama_lengkap);

    // 3. Like Search
    const { data: like, error: err3 } = await supabase
        .from('master_siswa')
        .select('nisn, nama_lengkap')
        .ilike('nisn', `%${unpaddedNISN}%`);

    if (err3) console.error('Error like search:', err3.message);
    console.log(`Found via Like %${unpaddedNISN}%:`, like?.length || 0);
    if (like?.length > 0) console.log('Matches:', like.map(s => `${s.nisn} - ${s.nama_lengkap}`));
}

checkNISN();
