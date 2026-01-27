const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPengaturanUsersMenu() {
    console.log('🔄 Adding Pengaturan Users to admin menu...\n');

    // New pages string with Pengaturan Users added
    const newPages = 'Dashboard,Jurnal>Jurnal=jurnal|Pengaturan Jurnal=jurnal/pengaturan|Form Siswa=jurnal/siswa,Konfigurasi Data>Master Data|Pengaturan Data|Pengaturan Users=pengaturan-users|Reset Data,Absensi,Nilai,LCKHApproval,LCKH,Status User=LogLogin,JadwalGuru,Rekap Data>Absensi=RekapAbsensi|Jurnal=RekapJurnal,Master Data>Wali Kelas=WaliKelas|Guru Asuh=GuruAsuh|Kelas,Pengaturan Akun=User,Export Data>Absensi=ExportAbsensi|Jurnal=ExportJurnal,Rekap Absen&Jurnal=RekapKehadiranJurnal,Layanan Guru>Absensi Guru=AbsensiSiswa|Jurnal Guru=JurnalGuru,Sosialisasi,Ketidakhadiran,StatusSiswa';

    try {
        // Get all admin users
        const { data: adminUsers, error: fetchError } = await supabase
            .from('users')
            .select('id, username, nama, role, pages')
            .ilike('role', '%admin%');

        if (fetchError) {
            console.error('❌ Error fetching admin users:', fetchError);
            return;
        }

        console.log(`📋 Found ${adminUsers.length} admin user(s)\n`);

        // Update each admin user
        let updatedCount = 0;
        for (const user of adminUsers) {
            console.log(`Updating: ${user.nama} (${user.username})`);

            const { error: updateError } = await supabase
                .from('users')
                .update({ pages: newPages })
                .eq('id', user.id);

            if (updateError) {
                console.error(`  ❌ Error updating ${user.username}:`, updateError.message);
            } else {
                console.log(`  ✅ Updated successfully`);
                updatedCount++;
            }
        }

        console.log(`\n✨ Done! Updated ${updatedCount} out of ${adminUsers.length} admin user(s)`);

        // Verify the update
        console.log('\n📊 Verifying updates...\n');
        const { data: verifyData, error: verifyError } = await supabase
            .from('users')
            .select('id, username, nama, pages')
            .ilike('role', '%admin%');

        if (!verifyError && verifyData) {
            verifyData.forEach(user => {
                const hasPengaturanUsers = user.pages.includes('Pengaturan Users');
                console.log(`${user.nama} (${user.username}): ${hasPengaturanUsers ? '✅' : '❌'} Pengaturan Users`);
            });
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the script
addPengaturanUsersMenu();
