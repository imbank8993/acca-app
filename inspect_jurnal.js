const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseKey = 'sb_publishable_xGS9w_p7dFONA-ZjxJSRQQ_y8iPBxFc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data, error } = await supabase
        .from('jurnal_guru')
        .select('*')
        .limit(3);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample Rows:', JSON.stringify(data, null, 2));
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        }
    }
}

inspect();
