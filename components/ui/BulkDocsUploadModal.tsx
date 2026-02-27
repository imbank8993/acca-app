
'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2'

interface Person {
    nisn?: string;
    nip?: string;
    nama_lengkap: string;
    [key: string]: any;
}

interface BulkDocsUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetRole?: 'siswa' | 'guru';
    data: Person[]; // Renamed from students
    onUploadSuccess: () => void;
    initialMode?: 'bulk' | 'single';
    preSelectedPerson?: Person | null;
}

interface FileItem {
    file: File;
    status: 'PENDING' | 'MATCHED' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
    matchedId?: string; // NISN or NIP
    matchedName?: string;
    manualId?: string;
    errorMessage?: string;
    progress: number;
}

export default function BulkDocsUploadModal({
    isOpen,
    onClose,
    targetRole = 'siswa',
    data,
    onUploadSuccess,
    initialMode = 'bulk',
    preSelectedPerson = null
}: BulkDocsUploadModalProps) {
    const [mode, setMode] = useState<'bulk' | 'single'>(initialMode);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(preSelectedPerson);
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<any[]>([]);

    const [fileItems, setFileItems] = useState<FileItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setSelectedPerson(preSelectedPerson);
            setFileItems([]);
            setCategory('');
            fetchCategories();
        }
    }, [isOpen, initialMode, preSelectedPerson]);

    const fetchCategories = async () => {
        const { data: cats } = await supabase
            .from('upload_categories')
            .select('*')
            .eq('target_role', targetRole)
            .order('name');
        if (cats) setCategories(cats);
    };

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(file => {
                let matchedId: string | undefined = undefined;
                let matchedName: string | undefined = undefined;
                let status: FileItem['status'] = 'PENDING';

                if (mode === 'single' && selectedPerson) {
                    matchedId = targetRole === 'siswa' ? selectedPerson.nisn : selectedPerson.nip;
                    matchedName = selectedPerson.nama_lengkap;
                    status = 'MATCHED';
                } else {
                    const idPattern = targetRole === 'siswa' ? /(\d{10})/ : /(\d{18})/; // NISN 10 digits, NIP usually 18
                    const match = file.name.match(idPattern);
                    if (match) {
                        const id = match[1];
                        const person = data.find(p => (targetRole === 'siswa' ? p.nisn : p.nip) === id);
                        if (person) {
                            matchedId = id;
                            matchedName = person.nama_lengkap;
                            status = 'MATCHED';
                        }
                    }
                }

                return {
                    file,
                    status,
                    matchedId,
                    matchedName,
                    progress: 0
                };
            });

            setFileItems(prev => [...prev, ...newFiles]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveFile = (index: number) => {
        setFileItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleManualSelect = (index: number, id: string) => {
        const person = data.find(p => (targetRole === 'siswa' ? p.nisn : p.nip) === id);
        setFileItems(prev => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                manualId: id,
                matchedName: person ? person.nama_lengkap : undefined,
                status: id ? 'MATCHED' : 'PENDING'
            };
            return next;
        });
    };

    const handleUpload = async () => {
        if (!category.trim()) {
            Swal.fire('Error', 'Nama Folder / Kategori harus diisi!', 'error');
            return;
        }

        if (mode === 'single' && !selectedPerson) {
            Swal.fire('Error', `Pilih ${targetRole === 'siswa' ? 'siswa' : 'guru'} terlebih dahulu!`, 'error');
            return;
        }

        const itemsToUpload = fileItems.filter(item =>
            (item.status === 'MATCHED' || (item.status === 'PENDING' && item.manualId))
        );

        if (itemsToUpload.length === 0) {
            Swal.fire('Info', 'Tidak ada file yang siap diupload.', 'info');
            return;
        }

        setIsUploading(true);

        const promises = fileItems.map(async (item, index) => {
            const targetId = mode === 'single' && selectedPerson
                ? (targetRole === 'siswa' ? selectedPerson.nisn : selectedPerson.nip)
                : (item.matchedId || item.manualId);

            if (!targetId || item.status === 'SUCCESS' || item.status === 'UPLOADING') return;

            setFileItems(prev => {
                const next = [...prev];
                next[index].status = 'UPLOADING';
                return next;
            });

            try {
                const formData = new FormData();
                formData.append('file', item.file);
                formData.append('category', category);

                const uploadRes = await fetch('https://icgowa.sch.id/akademik.icgowa.sch.id/upload_handler.php', {
                    method: 'POST',
                    body: formData,
                });

                const uploadResult = await uploadRes.json();

                if (!uploadRes.ok || uploadResult.status !== 'success') {
                    throw new Error(uploadResult.message || 'Upload failed on server.');
                }

                const { error: dbError } = await supabase
                    .from('dokumen_siswa')
                    .insert({
                        nisn: targetRole === 'siswa' ? targetId : null,
                        nip: targetRole === 'guru' ? targetId : null,
                        target_role: targetRole,
                        judul: item.file.name,
                        kategori: category,
                        file_url: uploadResult.file_url,
                        file_path: uploadResult.file_path,
                        uploaded_by: 'ADMIN'
                    });

                if (dbError) throw dbError;

                setFileItems(prev => {
                    const next = [...prev];
                    next[index].status = 'SUCCESS';
                    next[index].progress = 100;
                    return next;
                });

            } catch (err: any) {
                console.error('Upload Error:', err);
                setFileItems(prev => {
                    const next = [...prev];
                    next[index].status = 'ERROR';
                    next[index].errorMessage = err.message;
                    return next;
                });
            }
        });

        await Promise.all(promises);
        setIsUploading(false);

        const hasErrors = fileItems.find(i => i.status === 'ERROR');
        if (hasErrors) {
            Swal.fire('Selesai dengan error', 'Beberapa file gagal diupload.', 'warning');
        } else {
            Swal.fire('Sukses', 'Upload berhasil!', 'success');
            onUploadSuccess();
            setTimeout(onClose, 1000);
        }
    };

    return (
        <div className="jm__overlay" role="presentation">
            <div className="jm__modal" role="dialog" aria-modal="true">
                {/* Header */}
                <div className="jm__head">
                    <div className="jm__title">
                        <h2 className="text-[var(--n-primary)] flex items-center gap-2 text-base font-bold">
                            <i className="bi bi-cloud-upload-fill text-blue-600"></i>
                            Upload Center
                        </h2>
                        <p className="text-[var(--n-muted)] text-[10px] mt-0.5">
                            Kelola dokumen {targetRole === 'siswa' ? 'siswa' : 'guru'} dengan mudah dan cepat.
                        </p>
                    </div>
                    <button className="jm__close" onClick={onClose} aria-label="Tutup">
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="jm__body">
                    {/* Mode Selection */}
                    <div className="jm__subSection mb-4 !mt-0 flex gap-2">
                        <button
                            onClick={() => { setMode('bulk'); setFileItems([]); }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'bulk'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-transparent text-[var(--n-muted)] hover:bg-[var(--n-soft)]'}`}
                        >
                            <i className="bi bi-collection-fill mr-2"></i> Bulk Upload
                        </button>
                        <button
                            onClick={() => { setMode('single'); setFileItems([]); }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'single'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-transparent text-[var(--n-muted)] hover:bg-[var(--n-soft)]'}`}
                        >
                            <i className="bi bi-person-video2 mr-2"></i> Per {targetRole === 'siswa' ? 'Siswa' : 'Guru'}
                        </button>
                    </div>

                    <div className="jm__cols">
                        {/* Left Column: Configuration */}
                        <div className="jm__group">
                            <div className="jm__sectionTitle !mt-0">Pengaturan Upload</div>

                            <div className="jm__field">
                                <label>Jenis Dokumen <span className="text-red-500">*</span></label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="" disabled>-- Pilih Jenis --</option>
                                    {categories.map((cat: any) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {mode === 'single' && (
                                <div className="jm__field fade-in">
                                    <label>Target {targetRole === 'siswa' ? 'Siswa' : 'Guru'} <span className="text-red-500">*</span></label>
                                    <select
                                        value={targetRole === 'siswa' ? (selectedPerson?.nisn || '') : (selectedPerson?.nip || '')}
                                        onChange={(e) => {
                                            const s = data.find(st => (targetRole === 'siswa' ? st.nisn : st.nip) === e.target.value);
                                            setSelectedPerson(s || null);
                                        }}
                                    >
                                        <option value="">-- Pilih {targetRole === 'siswa' ? 'Siswa' : 'Guru'} --</option>
                                        {data.map(s => {
                                            const id = targetRole === 'siswa' ? s.nisn : s.nip;
                                            return (
                                                <option key={id} value={id}>{s.nama_lengkap} ({id})</option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            {mode === 'bulk' && (
                                <div className="jm__subSection flex items-start gap-2">
                                    <i className="bi bi-info-circle-fill text-blue-500 text-xs mt-0.5"></i>
                                    <div className="text-[10px] text-blue-800/80 leading-relaxed">
                                        Format nama file otomatis: <strong className="text-blue-700">[{targetRole === 'siswa' ? 'NISN' : 'NIP'}]_[Nama].pdf</strong>
                                    </div>
                                </div>
                            )}

                            <div className="jm__sectionTitle mt-2">Area Upload</div>

                            {/* Dropzone */}
                            <div
                                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer hover:border-blue-400 hover:bg-blue-50/30
                                    ${isUploading ? 'opacity-50 pointer-events-none' : 'border-slate-300'}
                                    ${fileItems.length > 0 ? 'bg-[var(--n-soft)]' : 'bg-[var(--n-card)]'}
                                `}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file" multiple className="hidden"
                                    ref={fileInputRef} onChange={handleFileSelect}
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <i className={`bi bi-cloud-arrow-up text-3xl text-[var(--n-muted)] ${fileItems.length > 0 ? 'hidden' : 'block'}`}></i>
                                    <span className="text-xs font-bold text-[var(--n-ink)]">
                                        {fileItems.length > 0 ? '+ Tambah File Lain' : 'Klik / Drop File'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: File List */}
                        <div className="jm__group h-full flex flex-col">
                            <div className="jm__sectionTitle !mt-0 flex justify-between items-center">
                                <span>Daftar File ({fileItems.length})</span>
                                {fileItems.length > 0 && (
                                    <button onClick={() => setFileItems([])} className="text-[9px] text-red-500 hover:text-red-700 font-bold uppercase">
                                        Clear All
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-[250px] max-h-[400px] border border-[var(--n-border)] rounded-xl bg-[var(--n-soft)] p-2 space-y-2">
                                {fileItems.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-[var(--n-muted)] opacity-50">
                                        <i className="bi bi-files text-2xl mb-2"></i>
                                        <span className="text-xs">Belum ada file dipilih</span>
                                    </div>
                                )}

                                {fileItems.map((item, idx) => (
                                    <div key={idx} className="bg-[var(--n-card)] p-2.5 rounded-lg border border-[var(--n-border)] flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-1">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 
                                            ${item.status === 'SUCCESS' ? 'bg-green-100 text-green-600' :
                                                item.status === 'ERROR' ? 'bg-red-100 text-red-600' :
                                                    'bg-slate-100 text-slate-500'}`}>
                                            {item.status === 'UPLOADING' ? <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></div> :
                                                item.status === 'SUCCESS' ? <i className="bi bi-check text-lg"></i> :
                                                    item.status === 'ERROR' ? <i className="bi bi-exclamation text-lg"></i> :
                                                        <i className="bi bi-file-earmark-text"></i>}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-[var(--n-ink)] truncate" title={item.file.name}>{item.file.name}</p>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <span className="text-[9px] text-[var(--n-muted)]">{(item.file.size / 1024).toFixed(0)} KB</span>

                                                {(item.matchedId || (mode === 'single' && selectedPerson) || item.manualId) ? (
                                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                                        {mode === 'single' && selectedPerson ? selectedPerson.nama_lengkap : item.matchedName || 'Manual Match'}
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] text-amber-600 font-bold">Unmatched</span>
                                                        {!isUploading && mode === 'bulk' && (
                                                            <select
                                                                className="text-[9px] border border-slate-200 rounded px-1 py-0.5 w-[100px]"
                                                                value={item.manualId || ''}
                                                                onChange={(e) => handleManualSelect(idx, e.target.value)}
                                                            >
                                                                <option value="">Pilih {targetRole === 'siswa' ? 'Siswa' : 'Guru'}...</option>
                                                                {data.map(s => {
                                                                    const id = targetRole === 'siswa' ? s.nisn : s.nip;
                                                                    return (
                                                                        <option key={id} value={id}>{s.nama_lengkap}</option>
                                                                    );
                                                                })}
                                                            </select>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {item.errorMessage && <p className="text-[9px] text-red-500 mt-1">{item.errorMessage}</p>}
                                        </div>

                                        {!isUploading && item.status !== 'SUCCESS' && (
                                            <button onClick={() => handleRemoveFile(idx)} className="text-slate-300 hover:text-red-500">
                                                <i className="bi bi-x-circle-fill"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="jm__foot">
                    <button onClick={onClose} disabled={isUploading} className="jm__btn jm__btnGhost">
                        Batal
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={isUploading || fileItems.length === 0}
                        className="jm__btn jm__btnPrimary"
                    >
                        {isUploading ? (
                            <><i className="bi bi-arrow-repeat animate-spin"></i> Uploading...</>
                        ) : (
                            <><i className="bi bi-cloud-arrow-up-fill"></i> Mulai Upload ({fileItems.length})</>
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .jm__overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(2, 6, 23, 0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 16px;
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.2s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .jm__modal {
                    width: min(800px, 100%);
                    background: var(--n-card);
                    border: 1px solid var(--n-border);
                    border-radius: 16px;
                    box-shadow: var(--n-shadow);
                    display: flex;
                    flex-direction: column;
                    height: auto;
                    max-height: 90vh; /* Fixed height relative to viewport */
                    overflow: hidden; /* Hide overflow of the modal container */
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .jm__head {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 6px;
                    padding: 12px 16px;
                    background: var(--n-soft);
                    border-bottom: 1px solid var(--n-border);
                    flex: 0 0 auto;
                    flex-shrink: 0;
                }

                .jm__title h2 {
                     color: var(--n-ink); 
                }

                .jm__close {
                    color: var(--n-muted);
                    transition: color 0.2s;
                }
                .jm__close:hover { color: #ef4444; }

                .jm__body {
                    padding: 16px; 
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    overflow-y: auto; 
                    flex: 1 1 auto; 
                    min-height: 0;
                    scrollbar-width: thin;
                }
                
                .jm__body::-webkit-scrollbar {
                    width: 4px;
                }
                .jm__body::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.1);
                    border-radius: 10px;
                }
                
                .jm__cols {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                    height: 100%;
                }
                @media (min-width: 768px) {
                    .jm__cols {
                        grid-template-columns: 4fr 6fr;
                        align-items: stretch;
                    }
                }

                .jm__group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px; 
                }

                .jm__sectionTitle {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 700;
                    color: var(--n-muted);
                    border-bottom: 1px solid var(--n-border);
                    padding-bottom: 4px;
                    margin-bottom: 4px;
                    margin-top: 4px;
                }

                .jm__field {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 8px; 
                }

                .jm__field label {
                    display: block;
                    font-size: 0.72rem; 
                    font-weight: 650;
                    color: var(--n-muted);
                    margin-bottom: 4px;
                }

                .jm__field input,
                .jm__field select,
                .jm__textarea {
                    width: 100%;
                    padding: 4px 10px; /* Adjusted padding for height */
                    height: 38px; /* Fixed height to match Select */
                    min-height: 38px;
                    border-radius: 10px;
                    border: 1px solid var(--n-border);
                    background: var(--n-card);
                    color: var(--n-ink);
                    font-weight: 500;
                    outline: none;
                    font-size: 0.82rem;
                    transition: all 0.2s;
                    box-sizing: border-box; /* Ensure padding doesn't add to height */
                } 
                
                .jm__field input:hover,
                .jm__field select:hover,
                .jm__textarea:hover {
                    border-color: rgba(58, 166, 255, 0.4);
                }

                .jm__field input:focus,
                .jm__field select:focus {
                    border-color: var(--n-primary);
                    box-shadow: var(--n-ring);
                }

                .jm__subSection {
                    margin-top: 0px;
                    padding: 8px;
                    background: var(--n-soft);
                    border: 1px dashed var(--n-border);
                    border-radius: 10px;
                }

                .jm__foot {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    padding: 12px 16px;
                    border-top: 1px solid var(--n-border);
                    background: var(--n-card);
                    flex: 0 0 auto;
                    flex-shrink: 0;
                }

                .jm__btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    height: 36px;
                    padding: 0 16px;
                    border-radius: 10px;
                    font-weight: 650;
                    cursor: pointer;
                    font-size: 0.82rem;
                    transition: all 0.2s;
                }

                .jm__btnGhost {
                    background: transparent;
                    color: rgba(100, 116, 139, 1);
                    border: 1px solid transparent;
                }
                .jm__btnGhost:hover {
                    background: rgba(241, 245, 249, 0.8);
                    color: rgba(15, 23, 42, 1);
                }

                .jm__btnPrimary {
                    background-color: var(--n-primary);
                    color: white;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .jm__btnPrimary:hover {
                    background-color: var(--n-primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 12px -2px rgba(0, 56, 168, 0.25);
                }
                .jm__btnPrimary:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    )
}
