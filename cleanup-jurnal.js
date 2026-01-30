const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Gunakan service role key untuk bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetJurnalTable() {
    console.log('--- Memulai Pembersihan Tabel Jurnal ---');

    // Menjalankan RPC atau SQL mentah melalui rpc jika tersedia, 
    // atau jalankan perintah SQL via admin client.
    // Catatan: Supabase JS Client tidak mendukung TRUNCATE langsung, 
    // jadi kita gunakan fitur SQL mentah jika memungkinkan atau jalankan via dashboard.

    // Namun, cara paling umum di script adalah:
    const { data, error } = await supabase.rpc('reset_jurnal_guru');

    if (error) {
        console.error('Gagal menjalankan reset:', error.message);
        console.log('\nSARAN: Jika RPC belum dibuat, jalankan perintah ini di SQL Editor Supabase:');
        console.log('TRUNCATE TABLE jurnal_guru RESTART IDENTITY;');
    } else {
        console.log('Berhasil: Semua data dihapus dan ID direset ke 1.');
    }
}

// Catatan: Untuk menjalankan script di atas via RPC, Anda harus membuat fungsi di PostgreSQL:
/*
CREATE OR REPLACE FUNCTION reset_jurnal_guru()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE jurnal_guru RESTART IDENTITY CASCADE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

resetJurnalTable();
