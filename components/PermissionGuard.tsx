'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserByAuthId } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions-client';

interface PermissionGuardProps {
    children: React.ReactNode;
    requiredPermission?: { resource: string, action: string };
    requiredPermissions?: { resource: string, action: string }[]; // OR Logic by default for array
    operator?: 'OR' | 'AND';
    // If user data is already available from parent
    user?: any;
}

export default function PermissionGuard({
    children,
    requiredPermission,
    requiredPermissions,
    operator = 'OR',
    user: propUser
}: PermissionGuardProps) {
    const [isAllowed, setIsAllowed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAccess();
    }, [propUser, requiredPermission, requiredPermissions]);

    const checkAccess = async () => {
        try {
            let userData = propUser;
            let adminStatus = false;

            if (!userData) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) {
                    setLoading(false);
                    return; // Not logged in
                }
                userData = await getUserByAuthId(authUser.id);
            }

            if (userData) {
                adminStatus = userData.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false;
                setIsAdmin(adminStatus);
                const perms = userData.permissions || [];

                let allowed = false;

                if (adminStatus) {
                    allowed = true;
                } else {
                    const checks: boolean[] = [];

                    if (requiredPermission) {
                        checks.push(hasPermission(perms, requiredPermission.resource, requiredPermission.action, adminStatus));
                    }

                    if (requiredPermissions && requiredPermissions.length > 0) {
                        for (const p of requiredPermissions) {
                            checks.push(hasPermission(perms, p.resource, p.action, adminStatus));
                        }
                    }

                    if (checks.length === 0) {
                        // No permissions required? Allow.
                        allowed = true;
                    } else {
                        if (operator === 'OR') {
                            allowed = checks.some(c => c);
                        } else {
                            allowed = checks.every(c => c);
                        }
                    }
                }

                setIsAllowed(allowed);
            }
        } catch (e) {
            console.error('PermissionGuard Error:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh] p-8">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
                    <span className="text-slate-500 text-sm font-medium">Memeriksa akses...</span>
                </div>
            </div>
        );
    }

    if (!isAllowed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-slate-50 rounded-xl m-6 border border-slate-200 shadow-sm animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-white">
                    <i className="bi bi-shield-lock-fill text-4xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Akses Dibatasi</h2>
                <p className="text-slate-600 max-w-lg leading-relaxed mb-6">
                    Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.<br />
                    Silakan hubungi <b>Administrator</b> jika Anda memerlukan akses ke modul ini.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="px-5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm focus:ring-2 focus:ring-slate-200"
                    >
                        <i className="bi bi-arrow-left mr-2"></i>Kembali
                    </button>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="px-5 py-2.5 rounded-lg bg-[#0b1b3a] text-white font-medium hover:bg-[#1e3a8a] transition-colors shadow-md focus:ring-2 focus:ring-blue-900"
                    >
                        <i className="bi bi-grid-fill mr-2"></i>Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Pass the fetched user data down to children if they are expecting it (optional enhancement for future)
    return <>{children}</>;
}
