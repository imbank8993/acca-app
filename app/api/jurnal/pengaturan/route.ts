import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Fetch current settings
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('jurnal_settings')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error;
        }

        // Return default if no settings exist
        if (!data) {
            return NextResponse.json({
                success: true,
                data: {
                    is_auto_generate_enabled: false,
                    generate_start_date: null,
                    generate_end_date: null,
                    skip_holidays: true
                }
            });
        }

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error('Error fetching jurnal settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings', details: error.message },
            { status: 500 }
        );
    }
}

// POST - Update settings
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            is_auto_generate_enabled,
            generate_start_date,
            generate_end_date,
            skip_holidays,
            created_by
        } = body;

        // Check if settings exist
        const { data: existing } = await supabaseAdmin
            .from('jurnal_settings')
            .select('id')
            .single();

        let result;

        if (existing) {
            // Update existing settings
            const { data, error } = await supabaseAdmin
                .from('jurnal_settings')
                .update({
                    is_auto_generate_enabled,
                    generate_start_date,
                    generate_end_date,
                    skip_holidays,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Insert new settings
            const { data, error } = await supabaseAdmin
                .from('jurnal_settings')
                .insert({
                    is_auto_generate_enabled,
                    generate_start_date,
                    generate_end_date,
                    skip_holidays,
                    created_by
                })
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return NextResponse.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Error updating jurnal settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings', details: error.message },
            { status: 500 }
        );
    }
}
