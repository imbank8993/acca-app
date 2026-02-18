'use client';

import DokumenSiswaTab from '../master/components/DokumenSiswaTab';
import PermissionGuard from '@/components/PermissionGuard';
import type { User } from '@/lib/types';

export default function DokumenSiswaUploadsPage({ user }: { user?: User }) {
    return (
        <PermissionGuard requiredPermission={{ resource: 'dokumen_siswa', action: 'view' }} user={user}>
            <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-[family-name:var(--font-outfit)]">

                {/* Header */}
                <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Monitoring Upload Siswa</h1>
                        <p className="text-slate-500 mt-1">Pantau dokumen yang diunggah oleh siswa dari Aplikasi Akademik.</p>
                    </div>
                </div>
                <div className="page-content">
                    <DokumenSiswaTab user={user} />
                </div>
                <style jsx>{`
                .page-content {
                    background: white;
                    padding: 24px;
                    border-radius: 24px;
                    border: 1px solid var(--n-border);
                }
                `}</style>
            </div>
        </PermissionGuard>
    );
}
