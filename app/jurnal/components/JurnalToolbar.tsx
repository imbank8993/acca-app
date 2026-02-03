'use client';

import Link from 'next/link';
import Select from 'react-select';

interface JurnalToolbarProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    canDo: (action: string) => boolean;
    showExportOptions: () => void;
    setShowAddModal: (val: boolean) => void;
    guruOptions: any[];
    mapelOptions: any[];
    kelasOptions: any[];
    setSelectedTeacher: (val: string | null) => void;
    setSelectedSubject: (val: string | null) => void;
    setSelectedClass: (val: string | null) => void;
    customSelectStyles: any;
}

export default function JurnalToolbar({
    searchTerm,
    setSearchTerm,
    canDo,
    showExportOptions,
    setShowAddModal,
    guruOptions,
    mapelOptions,
    kelasOptions,
    setSelectedTeacher,
    setSelectedSubject,
    setSelectedClass,
    customSelectStyles
}: JurnalToolbarProps) {
    return (
        <div className="jt__toolbar">
            {/* Baris 1: Search & Actions */}
            <div className="jt__toolbarRow jt__toolbarRow--top">
                <div className="jt__searchGroup">
                    <i className="bi bi-search" />
                    <input
                        type="text"
                        placeholder="Cari guru, mapel, materi, dll..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="jt__searchInput"
                    />
                </div>
                <div className="jt__actions">

                    <button
                        className="jt__btn jt__btnExport"
                        onClick={() => showExportOptions()}
                        disabled={!canDo('export')}
                        title="Export Data"
                    >
                        <i className="bi bi-file-earmark-excel" />
                        <span>Export</span>
                    </button>
                    <button
                        className="jt__btn jt__btnPrimary"
                        onClick={() => setShowAddModal(true)}
                        disabled={!canDo('create')}
                    >
                        <i className="bi bi-plus-lg" />
                        <span>Tambah</span>
                    </button>
                </div>
            </div>

            {/* Baris 2: All Filters (Guru, Mapel, Kelas) */}
            <div className="jt__toolbarRow jt__toolbarRow--bottom">
                <div className="jt__filterGroup">
                    <div className="jt__filterItem jt__filterItem--guru">
                        <Select
                            placeholder="Pilih Guru"
                            options={guruOptions}
                            isClearable
                            onChange={(opt: any) => setSelectedTeacher(opt ? opt.value : null)}
                            className="jt__select"
                            styles={customSelectStyles}
                        />
                    </div>
                    <div className="jt__filterItem">
                        <Select
                            placeholder="Pilih Mapel"
                            options={mapelOptions}
                            isClearable
                            onChange={(opt: any) => setSelectedSubject(opt ? opt.value : null)}
                            className="jt__select"
                            styles={customSelectStyles}
                        />
                    </div>
                    <div className="jt__filterItem">
                        <Select
                            placeholder="Pilih Kelas"
                            options={kelasOptions}
                            isClearable
                            onChange={(opt: any) => setSelectedClass(opt ? opt.value : null)}
                            className="jt__select"
                            styles={customSelectStyles}
                        />
                    </div>
                </div>
            </div>

            <style jsx>{`
                .jt__toolbar {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    background: var(--n-card);
                    padding: 20px;
                    border-radius: 24px;
                    border: 1px solid var(--n-border);
                    box-shadow: 0 4px 15px rgba(0, 56, 168, 0.03);
                    opacity: 0;
                    animation: slideDownToolbar 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    animation-delay: 0.15s;
                    transition: background 0.3s ease, border-color 0.3s ease;
                }

                :global(.dark) .jt__toolbar {
                    background: #0f172a;
                    border-color: rgba(255, 255, 255, 0.1);
                }

                @keyframes slideDownToolbar {
                    from { 
                        opacity: 0; 
                        transform: translateY(-20px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0); 
                    }
                }

                .jt__toolbarRow {
                    display: flex;
                    gap: 12px;
                    width: 100%;
                }

                .jt__toolbarRow--top {
                    flex-direction: column;
                }

                .jt__toolbarRow--bottom {
                    flex-direction: column;
                }

                @media (min-width: 1024px) {
                    .jt__toolbarRow--top {
                        flex-direction: row;
                        align-items: center;
                    }
                    .jt__toolbarRow--bottom {
                        flex-direction: row;
                    }
                }

                .jt__searchGroup {
                    position: relative;
                    flex: 1;
                }

                .jt__searchGroup i {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--n-muted);
                }

                .jt__searchInput {
                    width: 100%;
                    padding: 12px 16px 12px 42px;
                    border-radius: 14px;
                    border: 1px solid var(--n-border);
                    outline: none;
                    font-size: 0.9rem;
                    font-weight: 520;
                    transition: all 0.2s;
                    background: var(--n-card);
                    color: var(--n-ink);
                }

                :global(.dark) .jt__searchInput {
                    background: rgba(255, 255, 255, 0.04);
                    border-color: rgba(255, 255, 255, 0.1);
                }

                .jt__searchInput:focus {
                    border-color: var(--n-primary);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .jt__filterGroup {
                    display: flex;
                    gap: 12px;
                    flex-direction: column;
                    width: 100%;
                }

                @media (min-width: 768px) {
                    .jt__filterGroup {
                        flex-direction: row;
                        flex-wrap: nowrap;
                    }
                }

                .jt__filterItem {
                    flex: 1;
                    min-width: 0;
                }

                .jt__filterItem--guru {
                    flex: 1.5;
                }

                .jt__actions {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  width: 100%;
                }

                @media (min-width: 1024px) {
                    .jt__actions {
                        width: auto;
                    }
                }

                .jt__btn {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  height: 42px;
                  padding: 8px 16px;
                  border-radius: 12px;
                  flex: 1;
                  border: 1px solid var(--n-border);
                  background: var(--n-card);
                  color: var(--n-ink);
                  font-weight: 600;
                  font-size: 0.85rem;
                  cursor: pointer;
                  transition: all 0.2s;
                  white-space: nowrap;
                }

                @media (min-width: 1024px) {
                    .jt__btn {
                        flex: none;
                        padding: 8px 20px;
                    }
                }

                .jt__btn i {
                  font-size: 1rem;
                }

                .jt__btn:hover {
                  border-color: rgba(58, 166, 255, 0.25);
                  box-shadow: 0 4px 12px rgba(58, 166, 255, 0.2);
                  transform: translateY(-2px);
                  filter: brightness(1.1);
                }

                .jt__btnPrimary {
                  background: var(--n-primary);
                  border-color: var(--n-primary-light);
                  color: #fff;
                  font-weight: 650;
                  box-shadow: none; 
                }

                .jt__btnSettings {
                  background: #64748b;
                  border-color: #475569;
                  color: #fff;
                  text-decoration: none;
                }

                .jt__btnExport {
                  background: #10b981;
                  border-color: rgba(16, 185, 129, 0.28);
                  color: #fff;
                }
            `}</style>
        </div>
    );
}
