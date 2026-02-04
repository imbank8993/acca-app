// Migration Runner untuk LCKH Approval Page
// Run this script with: node run-lckh-approval-migration.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('🚀 Running LCKH Approval Page Migration...\n');

        // Read migration file
        const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260204_add_lckh_approval_page.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration file loaded');
        console.log('📝 Executing SQL...\n');

        // Execute migration
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Migration executed successfully!\n');

        // Verify changes
        console.log('🔍 Verifying changes...\n');

        // Check permissions
        const { data: perms } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('resource', 'lckh_approval');

        console.log('📋 Permissions created:');
        console.table(perms);

        // Check affected users
        const { data: users } = await supabase
            .from('users')
            .select('username, role, pages')
            .or('role.ilike.%ADMIN%,role.ilike.%WAKA%,role.ilike.%KAMAD%');

        console.log('\n👥 Users with LCKH Approval page:');
        users?.forEach(u => {
            const hasPage = u.pages?.includes('lckh-approval');
            console.log(`  ${hasPage ? '✅' : '❌'} ${u.username} (${u.role})`);
        });

        console.log('\n✨ Migration completed successfully!');

    } catch (error) {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    }
}

runMigration();
