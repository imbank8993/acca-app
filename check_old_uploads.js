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

async function checkOldUploads() {
    console.log('Checking "uploaded_documents" table (Old Student Uploads)...');

    const { data: oldDocs, error } = await supabase
        .from('uploaded_documents')
        .select('*');

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Found ${oldDocs.length} records in uploaded_documents.`);
        if (oldDocs.length > 0) console.log('Sample:', oldDocs[0]);
    }
}

checkOldUploads();
