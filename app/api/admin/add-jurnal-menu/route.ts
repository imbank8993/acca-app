import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// API endpoint to add Jurnal menu to users
// Run once: GET /api/admin/add-jurnal-menu
export async function GET(request: NextRequest) {
    try {
        const results = {
            admin: 0,
            guru: 0,
            opAbsensi: 0,
            errors: [] as string[]
        };

        // 1. Fetch and update Admin users
        const { data: adminUsers, error: adminFetchError } = await supabaseAdmin
            .from('users')
            .select('id, username, pages')
            .eq('role', 'Admin');

        if (adminFetchError) {
            results.errors.push(`Error fetching Admin users: ${adminFetchError.message}`);
        } else if (adminUsers) {
            for (const user of adminUsers) {
                if (!user.pages?.includes('Jurnal')) {
                    const newPages = (user.pages || '') + ',Jurnal>Jurnal=jurnal|Pengaturan Jurnal=jurnal/pengaturan';
                    const { error: updateError } = await supabaseAdmin
                        .from('users')
                        .update({ pages: newPages })
                        .eq('id', user.id);

                    if (updateError) {
                        results.errors.push(`Error updating Admin user ${user.username}: ${updateError.message}`);
                    } else {
                        results.admin++;
                    }
                }
            }
        }

        // 2. Fetch and update Guru users
        const { data: guruUsers, error: guruFetchError } = await supabaseAdmin
            .from('users')
            .select('id, username, pages')
            .eq('role', 'Guru');

        if (guruFetchError) {
            results.errors.push(`Error fetching Guru users: ${guruFetchError.message}`);
        } else if (guruUsers) {
            for (const user of guruUsers) {
                if (!user.pages?.includes('Jurnal')) {
                    const newPages = (user.pages || '') + ',Jurnal>Jurnal=jurnal';
                    const { error: updateError } = await supabaseAdmin
                        .from('users')
                        .update({ pages: newPages })
                        .eq('id', user.id);

                    if (updateError) {
                        results.errors.push(`Error updating Guru user ${user.username}: ${updateError.message}`);
                    } else {
                        results.guru++;
                    }
                }
            }
        }

        // 3. Fetch and update OP_Absensi users
        const { data: opUsers, error: opFetchError } = await supabaseAdmin
            .from('users')
            .select('id, username, pages')
            .eq('role', 'OP_Absensi');

        if (opFetchError) {
            results.errors.push(`Error fetching OP_Absensi users: ${opFetchError.message}`);
        } else if (opUsers) {
            for (const user of opUsers) {
                if (!user.pages?.includes('Jurnal')) {
                    const newPages = (user.pages || '') + ',Jurnal>Jurnal=jurnal|Pengaturan Jurnal=jurnal/pengaturan';
                    const { error: updateError } = await supabaseAdmin
                        .from('users')
                        .update({ pages: newPages })
                        .eq('id', user.id);

                    if (updateError) {
                        results.errors.push(`Error updating OP_Absensi user ${user.username}: ${updateError.message}`);
                    } else {
                        results.opAbsensi++;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Jurnal menu migration completed',
            results: {
                adminUpdated: results.admin,
                guruUpdated: results.guru,
                opAbsensiUpdated: results.opAbsensi,
                totalUpdated: results.admin + results.guru + results.opAbsensi,
                errors: results.errors
            }
        });
    } catch (error: any) {
        console.error('Error in add-jurnal-menu:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to add Jurnal menu',
                details: error.message
            },
            { status: 500 }
        );
    }
}
