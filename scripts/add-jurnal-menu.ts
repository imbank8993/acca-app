// Quick script to add Jurnal menu to users
import { supabaseAdmin } from './lib/supabase-admin';

async function addJurnalMenu() {
    console.log('Starting to add Jurnal menu...');

    try {
        // 1. Update Admin users
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('users')
            .update({
                pages: supabaseAdmin.raw(`pages || ',Jurnal>Jurnal=jurnal|Pengaturan Jurnal=jurnal/pengaturan'`)
            })
            .eq('role', 'Admin')
            .not('pages', 'like', '%Jurnal%')
            .select();

        if (adminError) {
            console.error('Error updating Admin users:', adminError);
        } else {
            console.log(`✓ Updated ${adminData?.length || 0} Admin users`);
        }

        // 2. Update Guru users
        const { data: guruData, error: guruError } = await supabaseAdmin
            .from('users')
            .update({
                pages: supabaseAdmin.raw(`pages || ',Jurnal>Jurnal=jurnal'`)
            })
            .eq('role', 'Guru')
            .not('pages', 'like', '%Jurnal%')
            .select();

        if (guruError) {
            console.error('Error updating Guru users:', guruError);
        } else {
            console.log(`✓ Updated ${guruData?.length || 0} Guru users`);
        }

        // 3. Update OP_Absensi users
        const { data: opData, error: opError } = await supabaseAdmin
            .from('users')
            .update({
                pages: supabaseAdmin.raw(`pages || ',Jurnal>Jurnal=jurnal|Pengaturan Jurnal=jurnal/pengaturan'`)
            })
            .eq('role', 'OP_Absensi')
            .not('pages', 'like', '%Jurnal%')
            .select();

        if (opError) {
            console.error('Error updating OP_Absensi users:', opError);
        } else {
            console.log(`✓ Updated ${opData?.length || 0} OP_Absensi users`);
        }

        console.log('\nDone! Logout and login again to see the new menu.');
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

addJurnalMenu();
