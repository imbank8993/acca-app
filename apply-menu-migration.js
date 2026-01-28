const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envConfig = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        process.env[key.trim()] = value.trim();
    }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Running migration via JS Client...');

    // Fetch all users
    const { data: users, error } = await supabase
        .from('users')
        .select('*');

    if (error) {
        console.error('❌ Error fetching users:', error);
        return;
    }

    console.log(`Found ${users.length} users. Checking for updates...`);

    for (const user of users) {
        let pages = user.pages || '';
        let updated = false;

        if (pages.includes('Tugas Tambahan')) {
            console.log(`Skipping user ${user.username || user.id}: Already has Tugas Tambahan`);
            continue;
        }

        const role = (user.role || '').toUpperCase();
        console.log(`Checking user ${user.username || user.id} (Role: ${role})`);
        const roles = Array.isArray(user.roles)
            ? user.roles.map(r => String(r).toUpperCase())
            : (typeof user.roles === 'string' && user.roles.startsWith('[')
                ? JSON.parse(user.roles).map(r => String(r).toUpperCase())
                : (typeof user.roles === 'string' ? user.roles.toUpperCase().split(',') : [])
            );

        console.log(`Roles array:`, roles);

        const isAdmin = role.includes('ADMIN') || roles.includes('ADMIN');
        const isGuru = role.includes('GURU') || roles.includes('GURU');

        if (isAdmin) {
            // Admin Logic
            pages += ',Tugas Tambahan>Laporan=TugasTambahan|Ploting=AdminTugasTambahan';
            updated = true;
        } else if (isGuru) {
            // Guru Logic
            pages += ',Tugas Tambahan=TugasTambahan';
            updated = true;
        }

        if (updated) {
            // Clean up commas if empty initially (though pages shouldn't be empty typically)
            if (pages.startsWith(',')) pages = pages.substring(1);

            console.log(`Updating user ${user.username || user.id} with new pages...`);
            const { error: updateError } = await supabase
                .from('users')
                .update({ pages })
                .eq('id', user.id);

            if (updateError) {
                console.error(`❌ Failed to update user ${user.id}:`, updateError);
            } else {
                console.log(`✅ Updated user ${user.id}`);
            }
        }
    }
}

runMigration().then(() => console.log('Done'));
