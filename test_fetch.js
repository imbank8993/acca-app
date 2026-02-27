
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing fetch from dokumen_siswa...');
    const resmi = await supabase.from('dokumen_siswa').select('*');
    if (resmi.error) console.error('dokumen_siswa error:', resmi.error);
    else console.log('dokumen_siswa success:', resmi.data.length, 'rows');

    console.log('Testing fetch from uploaded_documents...');
    const kiriman = await supabase.from('uploaded_documents').select('*');
    if (kiriman.error) console.error('uploaded_documents error:', kiriman.error);
    else console.log('uploaded_documents success:', kiriman.data.length, 'rows');
}

test();
