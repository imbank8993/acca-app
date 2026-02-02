
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersSchema() {
    console.log('--- Checking users table columns ---');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'"
    });

    if (error) {
        // Fallback if exec_sql is not available
        console.log('exec_sql failed, trying standard select...');
        const { data: users, error: selectError } = await supabase.from('users').select('*').limit(1);
        if (selectError) {
            console.error('Error fetching users:', selectError);
        } else if (users.length > 0) {
            console.log('Columns found via select:', Object.keys(users[0]));
        } else {
            console.log('No users found to check columns.');
        }
    } else {
        console.log('Columns:');
        data.forEach(c => console.log(`- ${c.column_name} (${c.data_type})`));
    }
}

checkUsersSchema();
