// require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', 'imrann') // Adjusted to match likely username
        .single();

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    console.log('--- USER DATA ---');
    console.log('Username:', users.username);
    console.log('Pages String:', users.pages);

    // Basic Parse Logic Simulation
    const pagesStr = users.pages || '';
    console.log('\n--- SIMULATED PARSE ---');
    let cleanedStr = pagesStr.replace(/[☑☐📊📋🔧↓📣🎓👥⊗🎯📈📉✓✔️❌⚠️📌📍🔔🔕]/g, '');
    cleanedStr = cleanedStr.replace(/[\u2610\u2611\u2612]/g, ',');
    const tokens = cleanedStr.split(',').map(s => s.trim()).filter(Boolean);

    tokens.forEach(token => {
        if (token.includes('>')) {
            console.log(`GROUP: ${token}`);
            const parts = token.split('>');
            console.log(`  Parent: ${parts[0]}`);
            console.log(`  Children: ${parts[1]}`);
        } else {
            console.log(`SINGLE: ${token}`);
        }
    });
}

checkUser();
