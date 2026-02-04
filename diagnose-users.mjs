import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkData() {
    console.log('--- AUTH USERS LIST ---');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error fetching auth users:', error);
    } else {
        console.log('Auth users:', users.map(u => ({ id: u.id, email: u.email, metadata: u.user_metadata })));
    }
}

checkData();
