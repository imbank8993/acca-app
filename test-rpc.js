const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRpc() {
    console.log('Testing exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });
    if (error) {
        console.error('❌ RPC exec_sql check failed:', error.message);
    } else {
        console.log('✅ RPC exec_sql exists and works!');
    }
}

testRpc();
