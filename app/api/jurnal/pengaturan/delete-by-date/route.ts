import { NextRequest, NextResponse } from 'next/server';
import { jurnalService } from '@/app/jurnal/lib/jurnalService';

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const jamKe = searchParams.get('jamKe');

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

        console.log('Deleting Jurnal:', { startDate, finalEndDate, jamKeFilter });

        const count = await jurnalService.deleteJurnal(startDate, finalEndDate, jamKeFilter);

        return NextResponse.json({
            success: true,
            count
        });

    } catch (error: any) {
        console.error('Error deleting jurnal:', error);
        const msg = error.message || 'Terjadi kesalahan';
        // Friendly error for missing column
        if (msg.includes('column "jam_ke_id" does not exist')) {
            return NextResponse.json(
                { success: false, error: 'Kolom jam_ke_id belum ada di database. Silakan hubungi admin.' },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { success: false, error: msg },
            { status: 500 }
        );
    }
}
