
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
    console.log('--- Checking Users Table (Public) ---');
    const { data: users, error } = await supabase.from('users').select('*');

    if (error) {
        console.error('Error fetching public users:', error);
    } else {
        console.log(`Found ${users.length} users in 'public.users' table:`);
        users.forEach(u => {
            console.log('User Keys:', Object.keys(u));
            console.log(`- ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, NIP: ${u.nip}, AuthID: ${u.auth_id}, GuruID: ${u.guru_id}`);
        });
    }

    console.log('\n--- Checking Auth Users (Private) ---');
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('Error fetching auth users:', authError);
    } else {
        console.log(`Found ${authUsers.length} users in 'auth.users':`);
        authUsers.forEach(u => {
            console.log(`- ID: ${u.id}, Email: ${u.email}`);
        });
    }
}

checkUsers();
