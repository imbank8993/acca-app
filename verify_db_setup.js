const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySetup() {
    console.log('Verifying setup...');

    // 1. Check users table for last_seen
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, last_seen')
        .limit(1);

    if (userError) {
        console.error('Error querying users:', userError.message);
        if (userError.message.includes('last_seen does not exist')) {
            console.error('CRITICAL: Column last_seen is MISSING in users table.');
        }
    } else {
        console.log('Users table query successful. Users found:', users.length);
        console.log('Sample user:', users[0]);
    }

    // 2. Check activity_logs table
    const { data: logs, error: logError } = await supabase
        .from('activity_logs')
        .select('*')
        .limit(1);

    if (logError) {
        console.error('Error querying activity_logs:', logError.message);
        if (logError.message.includes('relation "activity_logs" does not exist')) {
            console.error('CRITICAL: Table activity_logs is MISSING.');
        }
    } else {
        console.log('Activity_logs table query successful.');
    }
}

verifySetup();
