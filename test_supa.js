const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

async function main() {
    console.log('Fetching old items to test if reload worked...');

    // Test if column is missing
    const { data: initialData, error: initialError } = await supabase
        .from('master_jp_mapel')
        .select('*');

    console.log('Initial error:', initialError ? initialError.message : 'No error');

    // We can't really execute raw SQL through standard auth client without RPC setup.
    // Assuming user hasn't added `exec_sql`, the easiest fix for the cache is a simple REST reload trigger on the cloud platform.

    console.log('If you are seeing cache schema errors, you MUST click "Reload PostgREST" in Supabase dashboard under Settings > API.');
}

main();
