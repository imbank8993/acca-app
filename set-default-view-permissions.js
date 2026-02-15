const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runDefaultViewPermissions() {
    console.log('Starting Default View Permissions Setup...');

    // 1. Load Environment Variables
    const env = {};
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && value) env[key.trim()] = value.join('=').trim();
        });
    } else {
        console.error('.env.local not found!');
        process.exit(1);
    }

    const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 2. Define Permissions List (Copied from run-migration-upsert.js)
    const permissions = [
        // 1. DASHBOARD
        { category: '01. DASHBOARD', resource: 'dashboard', action: 'view' },

        // 2. AKADEMIK (UTAMA)
        { category: '02. AKADEMIK', resource: 'jurnal', action: 'view' },
        { category: '02. AKADEMIK', resource: 'absensi', action: 'view' },
        { category: '02. AKADEMIK', resource: 'nilai', action: 'view' },
        { category: '02. AKADEMIK', resource: 'ketidakhadiran', action: 'view' },
        { category: '02. AKADEMIK', resource: 'laporan_guru_asuh', action: 'view' },

        // 3. KINERJA (LCKH)
        { category: '03. KINERJA (LCKH)', resource: 'lckh', action: 'view' },
        { category: '03. KINERJA (LCKH)', resource: 'lckh_approval', action: 'view' },

        // 4. LAYANAN & INFO
        { category: '04. LAYANAN & INFO', resource: 'piket', action: 'view' },
        { category: '04. LAYANAN & INFO', resource: 'informasi', action: 'view' },
        { category: '04. LAYANAN & INFO', resource: 'dokumen_siswa', action: 'view' },
        { category: '04. LAYANAN & INFO', resource: 'informasi_akademik', action: 'view' },
        { category: '04. LAYANAN & INFO', resource: 'tugas_tambahan', action: 'view' },

        // 5. MASTER DATA (TABS & ACTIONS)
        { category: '05. MASTER DATA', resource: 'master', action: 'view' },

        // 6. PENGATURAN DATA
        { category: '06. PENGATURAN DATA', resource: 'pengaturan_data', action: 'view' },

        // 7. PENGATURAN TUGAS (PLOTTING JADWAL)
        { category: '07. PENGATURAN TUGAS', resource: 'pengaturan_tugas', action: 'view' },

        // 8. PENGATURAN USERS & SYSTEM
        { category: '08. SISTEM', resource: 'pengaturan_users', action: 'view' },
        { category: '08. SISTEM', resource: 'reset_data', action: 'view' },

        // Campione (New)
        { category: '01. DASHBOARD', resource: 'campione', action: 'view' }
    ];

    // 3. Define Roles
    // Using the standard roles plus variations found in common usage
    const roles = ['ADMIN', 'GURU', 'OP_ABSENSI', 'KAMAD', 'SISWA', 'WALI_KELAS', 'GURU_ASUH'];

    console.log(`Target Roles: ${roles.join(', ')}`);
    console.log(`Total View Resources: ${permissions.length}`);

    // 4. Upsert Permissions
    for (const role of roles) {
        console.log(`\nProcessing Role: ${role}...`);

        const upsertData = permissions.map(p => ({
            role_name: role,
            resource: p.resource,
            action: p.action,
            is_allowed: true
            // updated_at removed to avoid schema cache error
        }));

        const { error } = await supabaseAdmin
            .from('role_permissions')
            .upsert(upsertData, { onConflict: 'role_name,resource,action' });

        if (error) {
            console.error(`ERROR updating ${role}:`, error.message);
        } else {
            console.log(`SUCCESS: Granted ${upsertData.length} view permissions to ${role}`);
        }
    }

    console.log('\nDone!');
}

runDefaultViewPermissions();
