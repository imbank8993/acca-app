const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseKey = 'sb_publishable_xGS9w_p7dFONA-ZjxJSRQQ_y8iPBxFc'; // Using Anon key for now, assuming RLS allows DDL or using Service Role if needed.
// Ideally should use SERVICE_ROLE_KEY for migrations but usually anon works if policies allow or if we are just testing select/insert. DDL might fail with anon.
// Let's check environment for service role key.

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkAndPrint() {
    const sqlPath = path.join(__dirname, 'sql', '20260213_user_monitoring.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('--- SQL MIGRATION SCRIPT ---');
    console.log(sql);
    console.log('---------------------------');
    console.log('Please run the above SQL in your Supabase SQL Editor to create the activity_logs table and add last_seen column.');
}

checkAndPrint();
