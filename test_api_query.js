const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We can't easily fetch via HTTP localhost in this env sometimes without running server.
// Instead we will simulate what the API does using supabaseAdmin client directly.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiLogic() {
    console.log('Testing Supabase Join query...');

    const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          user_id,
          users (
              nama,
              role,
              foto_profil
          )
      `)
        .limit(5);

    if (error) {
        console.error('API Query Error:', error);
        console.log('Trying without join...');
        const { data: simpleData, error: simpleError } = await supabase
            .from('activity_logs')
            .select('*')
            .limit(5);

        if (simpleError) console.error('Simple Query Error:', simpleError);
        else console.log('Simple Query Success:', simpleData);

    } else {
        console.log('API Query Success:', data);
    }
}

testApiLogic();
