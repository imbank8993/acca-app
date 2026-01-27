'use client';

import PengaturanJurnalForm from '../components/PengaturanJurnalForm';

export default function PengaturanJurnalPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Pengaturan Jurnal</h1>
                <p className="text-gray-600">Kelola pengaturan generate dan hapus jurnal</p>
            </div>

            <PengaturanJurnalForm />
        </div>
    );
}
