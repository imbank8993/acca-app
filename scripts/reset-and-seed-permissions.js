const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PAGES = [
    { res: 'dashboard', label: 'Dashboard' },
    { res: 'jurnal', label: 'Jurnal Guru' },
    { res: 'absensi', label: 'Absensi Siswa' },
    { res: 'lckh', label: 'LCKH Submission' },
    { res: 'lckh_approval', label: 'LCKH Approval' },
    { res: 'nilai', label: 'Nilai' },
    { res: 'tugas_tambahan', label: 'Tugas Tambahan' },
    { res: 'laporan_guru_asuh', label: 'Laporan Guru Asuh' },
    { res: 'ketidakhadiran', label: 'Ketidakhadiran' },
    { res: 'informasi_akademik', label: 'Informasi Akademik' },
    { res: 'dokumen_siswa', label: 'Upload Dokumen' },
    { res: 'piket', label: 'Laporan Piket' },
    { res: 'master', label: 'Master Data' },
    { res: 'pengaturan_data', label: 'Pengaturan Data' },
    { res: 'pengaturan_tugas', label: 'Pengaturan Tugas' },
    { res: 'pengaturan_users', label: 'Pengaturan Users' },
    { res: 'reset_data', label: 'Reset Data' },
    { res: 'campione', label: 'Campione' },
    { res: 'agenda_akademik', label: 'Agenda Akademik' },
    { res: 'personal_documents', label: 'Personal Documents' },
    { res: 'monitoring', label: 'Monitoring' },
    { res: 'rekap_jurnal', label: 'Rekap Jurnal' },
    { res: 'arsip_siswa', label: 'Arsip Siswa' }
];

const TABS = [
    // Master
    { res: 'master.tahun_ajaran', label: 'Tab Tahun Ajaran', parent: 'master' },
    { res: 'master.siswa', label: 'Tab Siswa', parent: 'master' },
    { res: 'master.guru', label: 'Tab Guru', parent: 'master' },
    { res: 'master.kode_guru', label: 'Tab Kode Guru', parent: 'master' },
    { res: 'master.mapel', label: 'Tab Mata Pelajaran', parent: 'master' },
    { res: 'master.kelas', label: 'Tab Kelas', parent: 'master' },
    { res: 'master.waktu', label: 'Tab Waktu / Jam Sesi', parent: 'master' },
    { res: 'master.tugas_tambahan', label: 'Tab Master Tugas Tambahan', parent: 'master' },

    // Pengaturan Data
    { res: 'pengaturan_data.siswa_kelas', label: 'Tab Siswa per Kelas', parent: 'pengaturan_data' },
    { res: 'pengaturan_data.wali_kelas', label: 'Tab Wali Kelas', parent: 'pengaturan_data' },
    { res: 'pengaturan_data.guru_asuh', label: 'Tab Guru Asuh', parent: 'pengaturan_data' },
    { res: 'pengaturan_data.dropdown', label: 'Tab Dropdown Settings', parent: 'pengaturan_data' },
    { res: 'pengaturan_data.libur', label: 'Tab Hari Libur', parent: 'pengaturan_data' },
    { res: 'pengaturan_data.generate_jurnal', label: 'Tab Generate Jurnal', parent: 'pengaturan_data' },

    // Pengaturan Users
    { res: 'pengaturan_users.user_data', label: 'Tab Data User', parent: 'pengaturan_users' },
    { res: 'pengaturan_users.role_permissions', label: 'Tab Izin Role', parent: 'pengaturan_users' },
    { res: 'pengaturan_users.bulk_replace', label: 'Tab Bulk Replace Guru', parent: 'pengaturan_users' }
];

const ROLES = ['GURU', 'WALI_KELAS', 'WAKA', 'ADMIN'];

async function resetAndSeed() {
    console.log('🚀 Starting Permissions Reset & Seed...');

    try {
        // 1. Reset tables
        console.log('🧹 Clearing existing permissions...');
        await supabase.from('role_permissions').delete().neq('id', 0); // Delete all
        await supabase.from('master_permissions_list').delete().neq('id', 0); // Delete all

        const masterEntries = [];

        // 2. Generate Master List
        console.log('🌱 Generating master permission entries...');

        // Add default actions for PAGES
        for (const p of PAGES) {
            ['view', 'export', 'create', 'update', 'delete'].forEach(action => {
                masterEntries.push({
                    category: 'HALAMAN',
                    resource: p.res,
                    action: action,
                    label: `${p.label} (${action})`,
                    description: `${action.charAt(0).toUpperCase() + action.slice(1)} access for ${p.label}`
                });
            });
        }

        // Add default actions for TABS
        for (const t of TABS) {
            ['view', 'export', 'create', 'update', 'delete', 'import'].forEach(action => {
                masterEntries.push({
                    category: 'TAB',
                    resource: t.res,
                    action: action,
                    label: `${t.label} (${action})`,
                    description: `${action.charAt(0).toUpperCase() + action.slice(1)} access for ${t.label}`
                });
            });
        }

        // Insert into Master List
        const { error: masterError } = await supabase.from('master_permissions_list').insert(masterEntries);
        if (masterError) throw masterError;
        console.log(`✅ Seeded ${masterEntries.length} master permission entries.`);

        // 3. Backfill default permissions (View & Export)
        console.log('🚛 Backfilling default role permissions (View & Export)...');
        const rolePerms = [];

        for (const role of ROLES) {
            // Everyone gets View & Export for EVERYTHING in this clear reset
            // User can then disable specific ones via UI
            for (const entry of masterEntries) {
                if (entry.action === 'view' || entry.action === 'export') {
                    rolePerms.push({
                        role_name: role,
                        resource: entry.resource,
                        action: entry.action,
                        is_allowed: true
                    });
                }
            }
        }

        const { error: roleError } = await supabase.from('role_permissions').insert(rolePerms);
        if (roleError) throw roleError;
        console.log(`✅ Backfilled ${rolePerms.length} default role permissions.`);

        console.log('✨ Reset & Seed Complete!');
    } catch (error) {
        console.error('❌ Error during reset and seed:', error.message);
        process.exit(1);
    }
}

resetAndSeed();
