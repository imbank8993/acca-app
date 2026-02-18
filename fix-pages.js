const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const newPages = "Dashboard,Akademik>Jurnal Guru=jurnal|Absensi Siswa=absensi|Nilai=nilai|Laporan Piket=piket|Informasi Akademik=informasi-akademik|Upload Dokumen=dokumen-siswa,LCKH>LCKH Submission=lckh|LCKH Approval=lckh-approval,Administrasi>Master Data=master|Pengaturan Data=pengaturan-data|Pengaturan Users=pengaturan-users|Pengaturan Tugas=pengaturan-tugas|Reset Data=reset-data|Tugas Tambahan=tugas-tambahan|Ketidakhadiran=ketidakhadiran,Monitoring=monitoring,Rekap=RekapJurnal,Campione=campione";

async function fix() {
    const { data, error } = await supabase
        .from('users')
        .update({ pages: newPages })
        .ilike('username', 'imrann')
        .select();

    if (error) {
        console.error('Error updating:', error);
    } else {
        console.log('Updated user pages:', data);
    }
}

fix();
