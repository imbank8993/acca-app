'use client';

import JurnalTable from './components/JurnalTable';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function JurnalContent({ user }: { user?: any }) {
    const searchParams = useSearchParams();

    // Explicit filters from URL if any
    const filters = {
        nip: searchParams.get('nip') || undefined,
        kelas: searchParams.get('kelas') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
    };

    return (
        <JurnalTable
            filters={filters}
            permissions={user?.permissions}
            isAdmin={user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN')}
        />
    );
}

export default function JurnalPage({ user }: { user?: any }) {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-1">Jurnal Pembelajaran</h1>
                <p className="text-gray-500">Daftar kegiatan belajar mengajar harian</p>
            </div>

            <Suspense fallback={<div>Loading jurnal...</div>}>
                <JurnalContent user={user} />
            </Suspense>
        </div>
    );
}
