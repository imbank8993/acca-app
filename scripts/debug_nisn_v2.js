
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env.local');
console.log('Reading env from:', envPath);

let env = {};
try {
    const raw = fs.readFileSync(envPath, 'utf-8');
    raw.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let key = match[1].trim();
            let val = match[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            env[key] = val;
        }
    });
} catch (e) {
    console.error('Failed to read .env.local', e);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDB() {
    console.log('Querying master_siswa for any 5 records...');
    const { data: sample, error } = await supabase.from('master_siswa').select('nisn, nama_lengkap').limit(5);
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    console.log('Sample Data:', JSON.stringify(sample, null, 2));

    const target = '0089188239';
    console.log(`\nSearching specifically for ${target}...`);
    const { data: exact } = await supabase.from('master_siswa').select('*').eq('nisn', target);
    console.log(`Exact match count: ${exact?.length || 0}`);

    const unpadded = '89188239';
    console.log(`Searching unpadded ${unpadded}...`);
    const { data: loose } = await supabase.from('master_siswa').select('*').eq('nisn', unpadded);
    console.log(`Unpadded match count: ${loose?.length || 0}`);
}

inspectDB();
