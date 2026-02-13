const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseKey = 'sb_publishable_xGS9w_p7dFONA-ZjxJSRQQ_y8iPBxFc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data, error } = await supabase
        .from('master_dropdown')
        .select('kategori_kehadiran')
        .not('kategori_kehadiran', 'is', null);

    if (error) {
        console.error('Error:', error);
    } else {
        const distinct = [...new Set(data.map(d => d.kategori_kehadiran))];
        console.log('Distinct categories in master_dropdown:', distinct);
    }
}

inspect();
