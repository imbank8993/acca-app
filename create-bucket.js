const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function createBucket() {
    // 1. Load env
    const env = {};
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing env vars');
        return;
    }

    const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('Creating bucket "dokumen-siswa"...');

    // 2. Create Bucket
    const { data: bucket, error } = await supabaseAdmin
        .storage
        .createBucket('dokumen-siswa', {
            public: true,
            allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
            fileSizeLimit: 10485760 // 10MB
        });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "dokumen-siswa" already exists.');
        } else {
            console.error('Error creating bucket:', error);
            // Try updating if exists but configuration differs? No API for update bucket config easily via JS client here.
        }
    } else {
        console.log('Bucket created successfully:', bucket);
    }

    // 3. Test list buckets
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    console.log('Current buckets:', buckets.map(b => b.name));
}

createBucket();
