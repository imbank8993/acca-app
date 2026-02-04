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
        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260204_add_lckh_approval_page.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split SQL into individual statements (simple split by semicolon)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        const results = [];

        for (const statement of statements) {
            try {
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: statement + ';'
                });

                if (error) {
                    console.error('Error executing statement:', error);
                    results.push({ statement, error: error.message });
                } else {
                    results.push({ statement, success: true });
                }
            } catch (e: any) {
                console.error('Exception executing statement:', e);
                results.push({ statement, error: e.message });
            }
        }

        // Verify permissions were created
        const { data: perms } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('resource', 'lckh_approval');

        // Check users that were updated
        const { data: users } = await supabase
            .from('users')
            .select('id, username, role, pages')
            .or('role.ilike.%ADMIN%,role.ilike.%WAKA%,role.ilike.%KAMAD%');

        const updatedUsers = users?.filter(u => u.pages?.includes('lckh-approval'));

        return NextResponse.json({
            success: true,
            results,
            permissions: perms,
            updatedUsers: updatedUsers?.map(u => ({
                username: u.username,
                role: u.role,
                hasPage: u.pages?.includes('lckh-approval')
            }))
        });

    } catch (error: any) {
        console.error('Migration API error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
