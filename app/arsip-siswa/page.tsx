'use client';

import ArsipSiswaTab from '../master/components/ArsipSiswaTab';
import PermissionGuard from '@/components/PermissionGuard';
import type { User } from '@/lib/types';

export default function DokumenSiswaPage({ user }: { user?: User }) {
    return (
        <PermissionGuard requiredPermission={{ resource: 'dokumen_siswa', action: 'view' }} user={user}>
            <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-[family-name:var(--font-outfit)]">


                <div className="page-content">
                    <ArsipSiswaTab user={user} />
                </div>
                <style jsx>{`
                .page-wrapper {
                    display: flex;
                flex-direction: column;
                gap: 24px;
                    }
                .page-header {
                    background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%);
                padding: 48px 40px;
                border-radius: 24px;
                border: 1px solid rgba(255, 255, 255, 0.12);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
                    }
                .page-header::before {
                    content: '';
                position: absolute;
                top: -20%;
                right: -5%;
                width: 250px;
                height: 250px;
                background: radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(56, 189, 248, 0) 70%);
                filter: blur(60px);
                pointer-events: none;
                z-index: 1;
                    }
                .page-header::after {
                    content: '';
                position: absolute;
                bottom: -30%;
                left: 10%;
                width: 200px;
                height: 200px;
                background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0) 70%);
                filter: blur(50px);
                pointer-events: none;
                z-index: 1;
                    }
                .header-content {
                    position: relative;
                z-index: 2;
                    }
                .header-content h1 {
                    font - family: 'Poppins', sans-serif;
                font-size: 2.4rem;
                font-weight: 800;
                color: white;
                margin: 0 0 8px 0;
                letter-spacing: -0.03em;
                text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                .header-content p {
                    color: rgba(255, 255, 255, 0.85);
                font-size: 1.05rem;
                margin: 0;
                font-weight: 500;
                max-width: 600px;
                    }
                .page-content {
                    background: white;
                padding: 24px;
                border-radius: 24px;
                border: 1px solid var(--n-border);
                    }
                `}</style>
            </div>
        </PermissionGuard >
    );
}
