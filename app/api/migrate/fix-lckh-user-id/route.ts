import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Read the SQL migration file
        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260204_fix_lckh_user_id_type.sql')
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

        // Execute the migration
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: migrationSQL
        })

        if (error) {
            console.error('Migration error:', error)

            return NextResponse.json({
                success: false,
                error: error.message,
                instruction: 'Please run the migration file manually in Supabase Dashboard SQL Editor',
                migration_file: 'supabase/migrations/20260204_fix_lckh_user_id_type.sql'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'User ID type migration completed successfully',
            details: 'lckh_submissions.user_id converted from UUID to integer'
        })

    } catch (error: any) {
        console.error('Error executing migration:', error)
        return NextResponse.json({
            success: false,
            error: error.message,
            instruction: 'Please run the migration file manually in Supabase Dashboard SQL Editor: supabase/migrations/20260204_fix_lckh_user_id_type.sql'
        }, { status: 500 })
    }
}
