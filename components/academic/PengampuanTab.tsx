'use client'

import { useState, useEffect } from 'react'

interface Pengampuan {
    id: number;
    guru_nama: string;
    mapel_nama: string;
    kelas_nama: string;
    tahun_ajaran: string;
    semester: number;
}

export default function PengampuanTab() {
    const [loading, setLoading] = useState(true)
    const [dataList, setDataList] = useState<Pengampuan[]>([])

    // Modal
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        // Simulate fetch
        setTimeout(() => {
            setDataList([
                { id: 1, guru_nama: 'Budi Santoso', mapel_nama: 'Matematika Wajib', kelas_nama: 'X A', tahun_ajaran: '2024/2025', semester: 1 },
                { id: 2, guru_nama: 'Budi Santoso', mapel_nama: 'Matematika Wajib', kelas_nama: 'X B', tahun_ajaran: '2024/2025', semester: 1 },
                { id: 3, guru_nama: 'Siti Aminah', mapel_nama: 'Bahasa Indonesia', kelas_nama: 'X A', tahun_ajaran: '2024/2025', semester: 1 },
            ])
            setLoading(false)
        }, 800)
    }, [])

    return (
        <div className="tab-content">
            <div className="action-bar">
                <div className="filters">
                    <select className="select-filter">
                        <option>2024/2025</option>
                    </select>
                    <select className="select-filter">
                        <option>Semua Guru</option>
                    </select>
                </div>

                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <i className="bi bi-plus-lg"></i>
                    Tambah Pengampuan
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Guru</th>
                            <th>Mata Pelajaran</th>
                            <th>Kelas</th>
                            <th>Tahun/Sem</th>
                            <th style={{ width: '100px' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8">Memuat data...</td></tr>
                        ) : dataList.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Belum ada data pengampuan.</td></tr>
                        ) : (
                            dataList.map((item) => (
                                <tr key={item.id}>
                                    <td className="font-medium">{item.guru_nama}</td>
                                    <td>{item.mapel_nama}</td>
                                    <td><span className="badge-kelas">{item.kelas_nama}</span></td>
                                    <td>{item.tahun_ajaran} (Sem {item.semester})</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon delete">
                                                <i className="bi bi-trash"></i>
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
                            <h2>Plotting Guru Mapel</h2>
                            <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Pilih Guru</label>
                                <select className="form-select">
                                    <option>Pilih Guru...</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Pilih Mapel</label>
                                <select className="form-select">
                                    <option>Pilih Mapel...</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Pilih Kelas (Multiple)</label>
                                <div className="checkbox-group">
                                    <label><input type="checkbox" /> X A</label>
                                    <label><input type="checkbox" /> X B</label>
                                </div>
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
        .filters { display: flex; gap: 12px; }
        .select-filter { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 8px; background: #f9fafb; font-weight: 500; }

        .btn-primary { background: linear-gradient(135deg, #3aa6ff, #1c4c99); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .btn-secondary { background: #e5e7eb; color: #374151; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .data-table th { background: #f9fafb; font-weight: 600; color: #4b5563; }
        
        .badge-kelas { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; }

        .action-buttons { display: flex; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; color: #6b7280; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-icon:hover { background: #f3f4f6; color: #111827; }
        .btn-icon.delete:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #fff; border-radius: 12px; width: 100%; max-width: 500px; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-footer { padding: 20px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
        
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        label { font-size: 0.9rem; font-weight: 500; color: #374151; }
        input, select { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; }
        .checkbox-group { display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; max-height: 150px; overflow-y: auto; }
      `}</style>
        </div>
    )
}
