'use client'

import { useState, useEffect } from 'react'
import { exportToExcel } from '@/lib/excel-utils'

// Mock types until DB is ready
interface Rombel {
    id: number;
    nama: string; // From ref_kelas
    tingkat: number;
    program: string;
    wali_kelas_id: string;
    wali_kelas_nama: string;
    tahun_ajaran: string;
    jumlah_siswa: number;
}

export default function RombelTab() {
    const [loading, setLoading] = useState(true)
    const [rombelList, setRombelList] = useState<Rombel[]>([])
    const [selectedTahun, setSelectedTahun] = useState('2024/2025')

    // Modal
    const [showModal, setShowModal] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [currentRombel, setCurrentRombel] = useState<Partial<Rombel>>({})

    useEffect(() => {
        // Simulate fetch
        setTimeout(() => {
            setRombelList([
                { id: 1, nama: 'X A', tingkat: 10, program: 'Reguler', wali_kelas_id: 'G001', wali_kelas_nama: 'Budi Santoso', tahun_ajaran: '2024/2025', jumlah_siswa: 32 },
                { id: 2, nama: 'X B', tingkat: 10, program: 'Reguler', wali_kelas_id: 'G002', wali_kelas_nama: 'Siti Aminah', tahun_ajaran: '2024/2025', jumlah_siswa: 31 },
            ])
            setLoading(false)
        }, 1000)
    }, [selectedTahun])

    const handleAddNew = () => {
        setCurrentRombel({ tahun_ajaran: selectedTahun })
        setIsEditMode(false)
        setShowModal(true)
    }

    const handleEdit = (rombel: Rombel) => {
        setCurrentRombel(rombel)
        setIsEditMode(true)
        setShowModal(true)
    }

    const handleExport = () => {
        exportToExcel(rombelList, `Data_Rombel_${selectedTahun.replace('/', '-')}`, 'Rombel')
    }

    return (
        <div className="tab-content">
            <div className="action-bar">
                <div className="filters">
                    <select
                        value={selectedTahun}
                        onChange={(e) => setSelectedTahun(e.target.value)}
                        className="select-filter"
                    >
                        <option value="2024/2025">2024/2025</option>
                        <option value="2023/2024">2023/2024</option>
                    </select>
                </div>

                <div className="action-buttons-group">
                    <button className="btn-secondary" onClick={handleExport}>
                        <i className="bi bi-download"></i> Export data
                    </button>
                    <button className="btn-primary" onClick={handleAddNew}>
                        <i className="bi bi-plus-lg"></i>
                        Buat Rombel
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nama Kelas</th>
                            <th>Program</th>
                            <th>Wali Kelas</th>
                            <th>Jumlah Siswa</th>
                            <th style={{ width: '120px' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8">Memuat data...</td></tr>
                        ) : rombelList.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Belum ada rombel.</td></tr>
                        ) : (
                            rombelList.map((rombel) => (
                                <tr key={rombel.id}>
                                    <td className="font-medium">{rombel.nama}</td>
                                    <td>{rombel.program}</td>
                                    <td>
                                        {rombel.wali_kelas_nama ? (
                                            <div className="flex items-center gap-2">
                                                <i className="bi bi-person-circle text-gray-400"></i>
                                                <span>{rombel.wali_kelas_nama}</span>
                                            </div>
                                        ) : (
                                            <span className="text-red-500 italic text-sm">Belum ditentukan</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className="badge-count">{rombel.jumlah_siswa} Siswa</span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" onClick={() => handleEdit(rombel)} title="Atur Wali Kelas">
                                                <i className="bi bi-person-gear"></i>
                                            </button>
                                            <button className="btn-icon" title="Lihat Anggota">
                                                <i className="bi bi-people"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{isEditMode ? 'Edit Rombel' : 'Buat Rombel Baru'}</h2>
                            <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Tahun Ajaran</label>
                                <input type="text" value={currentRombel.tahun_ajaran} readOnly className="bg-gray-100" />
                            </div>
                            <div className="form-group">
                                <label>Nama Kelas (Ref)</label>
                                <select className="form-select">
                                    <option>Pilih Kelas...</option>
                                    <option>X A</option>
                                    <option>X B</option>
                                    <option>XI IPA 1</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Wali Kelas</label>
                                <select className="form-select">
                                    <option>Pilih Guru...</option>
                                    <option>Budi Santoso</option>
                                    <option>Siti Aminah</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                            <button className="btn-primary">Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
        .tab-content { padding: 24px; background: #fff; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .action-bar { display: flex; justify-content: space-between; margin-bottom: 24px; }
        
        .select-filter { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 8px; background: #f9fafb; font-weight: 500; }

        .btn-primary { background: linear-gradient(135deg, #3aa6ff, #1c4c99); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .data-table th { background: #f9fafb; font-weight: 600; color: #4b5563; }
        
        .badge-count { background: #e0e7ff; color: #3730a3; padding: 2px 10px; border-radius: 99px; font-weight: 600; font-size: 0.85rem; }

        .action-buttons { display: flex; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; color: #6b7280; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-icon:hover { background: #f3f4f6; color: #111827; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 500px; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
        
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        label { font-size: 0.9rem; font-weight: 500; color: #374151; }
        input, select { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; }
        .bg-gray-100 { background-color: #f3f4f6; }
        
        .font-medium { font-weight: 500; }
        .text-sm { font-size: 0.875rem; }
        .text-gray-500 { color: #6b7280; }
        .text-center { text-align: center; }
        .text-red-500 { color: #ef4444; }
        .italic { font-style: italic; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-2 { gap: 8px; }
        .text-gray-400 { color: #9ca3af; }
      `}</style>
        </div>
    )
}
