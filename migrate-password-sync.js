
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function runMigration() {
    const env = fs.readFileSync('.env.local', 'utf8');
    const envVars = Object.fromEntries(env.split('\n').map(l => l.split('=')).filter(p => p.length === 2));

    const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL.trim();
    const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY.trim();

    const supabase = createClient(supabaseUrl, supabaseKey);

    const sql = `
-- 1. Rename column if it exists as password_hash
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE public.users RENAME COLUMN password_hash TO password;
  END IF;
END $$;

-- 2. Ensure password column exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;

-- 3. Function to update auth.users password when public.users.password is updated
CREATE OR REPLACE FUNCTION public.sync_user_password_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.password IS DISTINCT FROM OLD.password AND NEW.auth_id IS NOT NULL) THEN
    UPDATE auth.users 
    SET encrypted_password = extensions.crypt(NEW.password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = NEW.auth_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger
DROP TRIGGER IF EXISTS on_public_user_password_update ON public.users;
CREATE TRIGGER on_public_user_password_update
AFTER UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_password_to_auth();
    `;

    console.log('Running Sync Password Migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('\n--- MANUAL SQL (Copy & Paste to Supabase SQL Editor) ---');
        console.log(sql);
    } else {
        console.log('✅ Migration completed successfully!');
    }
}

runMigration();
