const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/"/g, '');
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDocsAccess() {
    console.log('--- Debugging Documents Access ---');
    console.log('1. Fetching all documents from "dokumen_siswa" (No Filter)...');

    // Exactly matching code in ArsipSiswaTab.tsx
    let query = supabase
        .from('dokumen_siswa')
        .select('*')
        .order('created_at', { ascending: false });

    // Try to execute
    const { data, error } = await query;

    if (error) {
        console.error('❌ Error fetching docs:', JSON.stringify(error, null, 2));
        console.error('Error Details:', error);
    } else {
        console.log(`✅ Success! Retrieved ${data.length} documents.`);
        if (data.length > 0) {
            console.log('Sample Doc:', data[0]);
        } else {
            console.log('Table is empty, but access worked.');
        }
    }

    console.log('\n2. Testing Insert (to check if table is writable)...');
    // We won't actually insert, just wanted to check read first.
}

verifyDocsAccess();
