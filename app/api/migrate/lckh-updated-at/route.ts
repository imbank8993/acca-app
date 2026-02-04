import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        // Read migration file
        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260204_add_updated_at_to_lckh_submissions.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Execute as single block (PostgreSQL DO block)
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: sql
        });

        if (error) {
            console.error('Error executing migration:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // Verify column was added
        const { data: columns } = await supabase
            .rpc('exec_sql', {
                sql_query: `
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'lckh_submissions' 
                    AND column_name IN ('updated_at', 'last_update_at')
                    ORDER BY column_name;
                `
            });

        return NextResponse.json({
            success: true,
            message: 'Migration executed successfully',
            columns: columns
        });

    } catch (error: any) {
        console.error('Migration API error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
