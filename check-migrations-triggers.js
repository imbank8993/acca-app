const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://suwdqtaxnooowxaxvilr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0'
);

async function checkTriggers() {
    console.log('Checking triggers for jurnal_guru and absensi_sesi...');
    // Since we cannot query pg_trigger directly through the SDK usually,
    // let's try to see if there's any obvious side effect or if we can use an RPC
    // if a general SQL exec RPC exists. (Often called 'exec_sql' or similar in internal setups)

    // Instead, let's look at the migration files again very carefully for any TRIGGER keywords.
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = './supabase/migrations';

    const files = fs.readdirSync(migrationsDir);
    files.forEach(file => {
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        if (content.toUpperCase().includes('TRIGGER') || content.toUpperCase().includes('FUNCTION')) {
            console.log(`Found Trigger/Function in: ${file}`);
            // Let's see the context
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                if (line.toUpperCase().includes('TRIGGER') || line.toUpperCase().includes('FUNCTION')) {
                    console.log(`  L${i + 1}: ${line.trim()}`);
                }
            });
        }
    });
}

checkTriggers();
