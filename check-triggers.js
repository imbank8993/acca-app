const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function checkTriggers() {
    console.log('Checking triggers on jurnal_guru...');
    // We can't query information_schema directly with Supabase Client usually unless exposed.
    // But we can try an RPC if it exists, or just a known trigger.
    // Instead, let's try to query information_schema.triggers via .from() (might fail)
    try {
        const { data, error } = await supabase
            .from('pg_trigger')
            .select('tgname')
            .limit(10);
        if (error) throw error;
        console.log('Found triggers (generic):', data);
    } catch (e) {
        console.log('Cannot query pg_trigger directly.');
    }
}

checkTriggers();
