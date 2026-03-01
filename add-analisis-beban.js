const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suwdqtaxnooowxaxvilr.supabase.co';
// Note: using the key found in fix-pages.js
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2RxdGF4bm9vb3d4YXh2aWxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg5NDI1NiwiZXhwIjoyMDg0NDcwMjU2fQ.JRRxTcWdXo3LOI20zIRqbsIyABg4mP1yc7X00rEaMK0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addMenu() {
    const { data: users, error: fetchErr } = await supabase.from('users').select('id, username, pages');
    if (fetchErr) {
        console.error('Fetch error:', fetchErr);
        return;
    }

    for (const u of users) {
        if (!u.pages) continue;
        if (!u.pages.includes('Analisis Beban Kerja=analisis-beban-kerja')) {
            // Add to Administrasi
            let newPages = u.pages;
            if (newPages.includes('Administrasi>')) {
                newPages = newPages.replace('Administrasi>', 'Administrasi>Analisis Beban Kerja=analisis-beban-kerja|');
            } else {
                newPages += ',Analisis Beban Kerja=analisis-beban-kerja';
            }

            const { error: updErr } = await supabase.from('users').update({ pages: newPages }).eq('id', u.id);
            if (updErr) {
                console.error('Update error for', u.username, updErr);
            } else {
                console.log('Successfully added menu for', u.username);
            }
        } else {
            console.log('Menu already exists for', u.username);
        }
    }
}

addMenu();
