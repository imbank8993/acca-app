
const { supabaseAdmin } = require('./lib/supabase-admin');

async function checkColumns() {
    const { data, error } = await supabaseAdmin.from('users').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Available columns in users table:', Object.keys(data[0] || {}));
}

checkColumns();
