const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseKey = 'sb_publishable_xGS9w_p7dFONA-ZjxJSRQQ_y8iPBxFc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Checking for tables...');

    // Try querying potential tables
    const userTable = await supabase.from('users').select('*').limit(1);
    const logTable = await supabase.from('activity_logs').select('*').limit(1);
    const auditTable = await supabase.from('audit_logs').select('*').limit(1);

    console.log('Users Table Error:', userTable.error ? userTable.error.message : 'Exists');
    if (userTable.data && userTable.data.length > 0) console.log('Users Columns:', Object.keys(userTable.data[0]));

    console.log('Activity Logs Table Error:', logTable.error ? logTable.error.message : 'Exists');
    if (logTable.data && logTable.data.length > 0) console.log('Activity Columns:', Object.keys(logTable.data[0]));

    console.log('Audit Logs Table Error:', auditTable.error ? auditTable.error.message : 'Exists');
}

inspect();
