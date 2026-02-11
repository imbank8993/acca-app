const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function checkTypes() {
    console.log('Checking column types for jurnal_guru...');
    // We can use an RPC or just check the data format
    const { data } = await supabase.from('jurnal_guru').select('tanggal').limit(1);
    if (data && data[0]) {
        console.log('Type of tanggal:', typeof data[0].tanggal, data[0].tanggal);
    }
}

checkTypes();
