'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    ids?: string[]; // Array of IDs for multi-share
    id?: string;    // Single ID
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
    ids,
    id,
    folderId,
    title
}: ShareModalProps) {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState<number | null>(null);

    const isFolder = !!folderId;
    const documentIds = ids || (id ? [id] : []);

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
                : { document_ids: documentIds, shared_with_user_id: userId };

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-8 overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                            {isFolder ? 'Bagikan Folder' : 'Bagikan Dokumen'}
                        </h2>
                        <p className="text-sm text-slate-400 font-medium mt-1 line-clamp-1">"{title}"</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="relative group">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500"></i>
                        <input
                            type="text"
                            className="w-full pl-12 pr-4 h-12 bg-slate-50/80 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-semibold text-slate-700"
                            placeholder="Cari nama atau username..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[200px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <i className="fa-solid fa-circle-notch fa-spin text-2xl text-blue-500"></i>
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Mencari Pengguna...</div>
                            </div>
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group/item">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 text-white flex items-center justify-center font-black text-lg shadow-sm">
                                            {(user.nama_lengkap || user.nama || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="text-sm font-bold text-slate-800">{user.nama_lengkap || user.nama}</div>
                                            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">@{user.username}</div>
                                        </div>
                                    </div>
                                    <button
                                        className={`h-9 px-4 rounded-xl text-xs font-black transition-all shadow-sm ${sharing === user.id
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                                            }`}
                                        onClick={() => handleShare(user.id)}
                                        disabled={sharing !== null}
                                    >
                                        {sharing === user.id ? '...' : 'Bagikan'}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                <i className="fa-solid fa-users-slash text-3xl mb-3"></i>
                                <div className="text-xs font-bold uppercase tracking-widest">Tidak ada hasil</div>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <button
                            className="w-full h-12 border-2 border-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 hover:text-slate-700 transition-all"
                            onClick={onClose}
                        >
                            Selesai
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
