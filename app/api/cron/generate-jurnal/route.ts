import { NextRequest, NextResponse } from 'next/server';
import { jurnalService } from '@/app/jurnal/lib/jurnalService';
import { supabaseAdmin } from '@/lib/supabase-admin';

// This endpoint is called by Vercel Cron to auto-generate journals daily
// Protected by authorization header
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET || 'default-secret-change-in-production';

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if auto-generate is enabled in settings
        const { data: settings } = await supabaseAdmin
            .from('jurnal_settings')
            .select('*')
            .single();

        if (!settings || !settings.is_auto_generate_enabled) {
            return NextResponse.json({
                success: false,
                message: 'Auto-generate is disabled in settings'
            });
        }

        // Generate for today
        const today = new Date().toISOString().split('T')[0];

        // Use settings date range if specified, otherwise just generate for today
        const startDate = settings.generate_start_date || today;
        const endDate = settings.generate_end_date || today;

        // Run the generation
        const results = await jurnalService.generateJurnal(startDate, endDate);

        return NextResponse.json({
            success: true,
            message: 'Auto-generate completed successfully',
            date: today,
            results: {
                generated: results.generated,
                skipped_holiday: results.skipped_holiday,
                errors: results.errors
            }
        });
    } catch (error: any) {
        console.error('Cron auto-generate error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to auto-generate journals',
                details: error.message
            },
            { status: 500 }
        );
    }
}
