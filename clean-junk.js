
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2 && !line.startsWith('#')) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            process.env[key] = val;
        }
    });
} catch (e) { }

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clean() {
    // Delete 'Foto' category as it seems to be junk
    const { error } = await supabase
        .from('informasi_akademik')
        .delete()
        .eq('category', 'Foto');

    if (error) console.error('Error deleting Foto:', error);
    else console.log('Successfully deleted category "Foto"');
}

clean();
