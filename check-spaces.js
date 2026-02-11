const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function checkSpaces() {
    console.log('Checking for trailing spaces in kelas...');
    const { data } = await supabase.from('jurnal_guru').select('kelas').limit(100);
    const withSpaces = data?.filter(r => r.kelas !== r.kelas.trim());
    if (withSpaces && withSpaces.length > 0) {
        console.log('Found classes with spaces:', withSpaces);
    } else {
        console.log('No trailing spaces in class names found.');
    }
}

checkSpaces();
