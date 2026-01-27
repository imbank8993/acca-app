
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicies() {
    console.log('--- Checking RLS Policies on users ---');

    // Query pg_policies via RPC or indirectly if possible. Since we can't easily query catalog tables via postgrest, 
    // we will try to infer by selecting from 'users' as an ANON user (without service role).

    const anonKey = 'sb_publishable_xGS9w_p7dFONA-ZjxJSRQQ_y8iPBxFc'; // Found in .env.local
    const supabaseAnon = createClient(supabaseUrl, anonKey);

    // 1. Try as ANON
    console.log('\n1. Querying as ANON (expecting failure or empty if RLS is on)...');
    const { data: anonData, error: anonError } = await supabaseAnon.from('users').select('*').limit(5);
    if (anonError) console.log('ANON Error:', anonError.message);
    else console.log(`ANON Data: found ${anonData.length} rows`);

    // 2. Try as Authenticated User (Simulated)
    // We need a valid JWT. We can sign one if we had the secret, but we don't have the JWT secret easily available (service role key is different).
    // Actually, we can use signInWithPassword if we knew the password, but we don't.
    // However, we can use the service role client to generate a link or just inspect the policies if we had SQL access.

    // Since we can't easily simulate Auth user without a password/token, we'll rely on the ANON check.
    // If ANON gets 0 rows, it means RLS is likely ON and defaulting to deny.

    // We can also try to RPC if there is a function to exec sql, but likely not.
}

checkPolicies();
