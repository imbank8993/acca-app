'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentIds?: string[]; // Array of IDs for multi-share
    documentId?: string;    // Single ID
    folderId?: string;      // Folder share
    title: string;          // Name of folder or single/multiple docs
}

interface User {
    id: number;
    nama_lengkap?: string;
    nama?: string;
    username: string;
}

export default function ShareModal({
    isOpen,
    onClose,
    documentIds,
    documentId,
    folderId,
    title
}: ShareModalProps) {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState<number | null>(null);

    const isFolder = !!folderId;
    const isMulti = !!documentIds && documentIds.length > 0;
    const ids = isMulti ? documentIds : (documentId ? [documentId] : []);

    useEffect(() => {
        if (!isOpen) return;

        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search, isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/personal/users/search?q=${search}`);
            const json = await res.json();
            if (json.ok) setUsers(json.data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async (userId: number) => {
        setSharing(userId);
        try {
            const url = isFolder
                ? '/api/personal/folders/share'
                : '/api/personal/documents/share';

            const body = isFolder
                ? { folder_id: folderId, shared_with_user_id: userId }
                : { document_ids: ids, shared_with_user_id: userId };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const json = await res.json();
            if (json.ok) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Berhasil dibagikan',
                    showConfirmButton: false,
                    timer: 2000
                });
            } else {
                Swal.fire('Gagal', json.error, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Gagal membagikan akses', 'error');
        } finally {
            setSharing(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {isFolder ? 'Bagikan Folder' : 'Bagikan Dokumen'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{title}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all outline-none"
                            placeholder="Cari nama atau username..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {loading ? (
                            <div className="p-4 text-center text-slate-400 text-sm">Mencari...</div>
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-blue-900/10 text-blue-900 flex items-center justify-center font-bold text-sm">
                                            {(user.nama_lengkap || user.nama || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800">{user.nama_lengkap || user.nama}</div>
                                            <div className="text-xs text-slate-500">@{user.username}</div>
                                        </div>
                                    </div>
                                    <button
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sharing === user.id
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-blue-900/10 text-blue-900 hover:bg-blue-900 hover:text-white'
                                            }`}
                                        onClick={() => handleShare(user.id)}
                                        disabled={sharing !== null}
                                    >
                                        {sharing === user.id ? 'Memproses...' : 'Bagikan'}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-sm">Tidak ada user ditemukan.</div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <button
                            className="w-full px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-all"
                            onClick={onClose}
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
