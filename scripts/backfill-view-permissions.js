const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const STANDARD_RESOURCES = [
    // Pages
    'dashboard', 'jurnal', 'absensi', 'lckh', 'lckh-approval',
    'nilai', 'tugas-tambahan', 'laporan-guru-asuh', 'ketidakhadiran',
    'informasi-akademik', 'dokumen-siswa', 'piket', 'master',
    'pengaturan-data', 'pengaturan-tugas', 'pengaturan-users',
    'reset-data', 'campione', 'agenda-akademik', 'personal-documents',
    'monitoring', 'rekap-jurnal', 'arsip-siswa',

    // Tabs in Master
    'master.tahun_ajaran', 'master.siswa', 'master.guru', 'master.kode_guru',
    'master.mapel', 'master.kelas', 'master.waktu', 'master.tugas_tambahan',

    // Tabs in Pengaturan Data
    'pengaturan_data.siswa_kelas', 'pengaturan_data.wali_kelas',
    'pengaturan_data.guru_asuh', 'pengaturan_data.dropdown',
    'pengaturan_data.libur', 'pengaturan_data.generate_jurnal',

    // Tabs in Pengaturan Users
    'pengaturan_users.user_data', 'pengaturan_users.role_permissions',
    'pengaturan_users.bulk_replace'
];

const ROLES_TO_BACKFILL = ['GURU', 'WALI_KELAS', 'WAKA', 'ADMIN'];

async function backfill() {
    console.log('Backfilling view permissions...');

    for (const role of ROLES_TO_BACKFILL) {
        console.log(`Processing role: ${role}`);
        for (const res of STANDARD_RESOURCES) {
            const resource = res.replace(/-/g, '_');
            const actions = ['view', 'export'];

            for (const action of actions) {
                const { error } = await supabase
                    .from('role_permissions')
                    .upsert({
                        role_name: role,
                        resource: resource,
                        action: action,
                        is_allowed: true
                    }, { onConflict: 'role_name,resource,action' });

                if (error) {
                    console.error(`  Error backfilling ${role} for ${resource}:${action}`, error.message);
                } else {
                    console.log(`  Success: ${role} -> ${resource}:${action}`);
                }
            }
        }
    }

    console.log('Backfill complete.');
}

backfill();
