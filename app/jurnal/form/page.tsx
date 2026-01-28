'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import JournalEntryForm from '../components/JournalEntryForm';

function FormJurnalContent() {
    const searchParams = useSearchParams();
    const [journalData, setJournalData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get parameters from URL
    const nip = searchParams.get('nip') || '';
    const tanggal = searchParams.get('tanggal') || '';
    const jam_ke = parseInt(searchParams.get('jam_ke') || '0');
    const kelas = searchParams.get('kelas') || '';

    useEffect(() => {
        if (nip && tanggal && jam_ke && kelas) {
            fetchJournalData();
        } else {
            setError('Parameter tidak lengkap. Harap akses halaman ini dari link yang benar.');
            setLoading(false);
        }
    }, [nip, tanggal, jam_ke, kelas]);

    const fetchJournalData = async () => {
        try {
            const queryParams = new URLSearchParams({
                nip,
                startDate: tanggal,
                endDate: tanggal
            });

            const response = await fetch(`/api/jurnal?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch journal data');

            const result = await response.json();

            // Find the specific journal entry
            const journal = result.data.find(
                (j: any) => j.nip === nip &&
                    j.tanggal === tanggal &&
                    j.kelas === kelas &&
                    (
                        // Check if URL param matches jam_ke_id (number)
                        (j.jam_ke_id && j.jam_ke_id === jam_ke) ||
                        // OR matches the string representation (old behavior/fallback)
                        j.jam_ke === jam_ke.toString()
                    )
            );

            if (!journal) {
                throw new Error('Jurnal tidak ditemukan');
            }

            setJournalData(journal);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const [userPermissions, setUserPermissions] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { supabase } = await import('@/lib/supabase');
            const { getUserByAuthId } = await import('@/lib/auth');
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (authUser) {
                const userData = await getUserByAuthId(authUser.id);
                if (userData) {
                    setUserPermissions(userData.permissions || []);
                    setIsAdmin(userData.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false);
                }
            }
        } catch (e) {
            console.error('Error fetching user data', e);
        }
    };

    const canDo = (resource: string, action: string) => {
        const { hasPermission } = require('@/lib/permissions-client');
        return hasPermission(userPermissions, resource, action, isAdmin);
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-gray-600">Memuat data...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <h3 className="font-semibold mb-2">Error</h3>
                    <p>{error}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Kembali
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Form Jurnal</h1>
                <p className="text-gray-600">Isi atau update jurnal pembelajaran</p>
            </div>

            <JournalEntryForm
                nip={nip}
                tanggal={tanggal}
                jam_ke={jam_ke}
                kelas={kelas}
                initialData={journalData}
                canDo={canDo}
            />
        </div>
    );
}

export default function FormJurnalPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading form...</div>}>
            <FormJurnalContent />
        </Suspense>
    );
}
