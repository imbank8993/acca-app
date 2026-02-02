import { NextRequest, NextResponse } from 'next/server';
import { jurnalService } from '@/app/jurnal/lib/jurnalService';

export async function POST(request: NextRequest) {
    try {
        const { startDate, endDate, jamKe } = await request.json();

        if (!startDate) {
            return NextResponse.json(
                { success: false, error: 'Tanggal mulai wajib diisi' },
                { status: 400 }
            );
        }

        const finalEndDate = endDate || startDate;

        // Parse "1,2,6" -> [1, 2, 6]
        let jamKeFilter: number[] = [];
        if (jamKe) {
            jamKeFilter = jamKe.toString().split(',')
                .map((j: string) => parseInt(j.trim()))
                .filter((n: number) => !isNaN(n));
        }

        console.log('Generating Jurnal:', { startDate, finalEndDate, jamKeFilter });

        const results = await jurnalService.generateJurnal(startDate, finalEndDate, jamKeFilter);

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        console.error('Error generating jurnal:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Terjadi kesalahan saat generate jurnal' },
            { status: 500 }
        );
    }
}
