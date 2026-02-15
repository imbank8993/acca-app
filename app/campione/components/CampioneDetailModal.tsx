import React from 'react';

interface IncidentDetail {
    type: string;
    tanggal: string;
    kelas: string;
    mapel: string;
    jam_ke: string;
    keterangan: string;
}

interface CampioneDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacherName: string;
    details: IncidentDetail[];
    category: string;
}

export default function CampioneDetailModal({ isOpen, onClose, teacherName, details, category }: CampioneDetailModalProps) {
    if (!isOpen) return null;

    // Filter details based on the current category if needed, 
    // or just show all returned (api returns all, but we might want to filter by type matches category)
    // The API pushes details for ALL types. We should filter by the active tab/category.
    const filteredDetails = details.filter(d => {
        if (category === 'jamKosong' && d.type === 'Jam Kosong') return true;
        if (category === 'penugasan' && d.type === 'Penugasan') return true;
        if (category === 'terlambat' && d.type === 'Terlambat') return true;
        return false;
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Detail {category === 'jamKosong' ? 'Jam Kosong' : category === 'penugasan' ? 'Penugasan' : 'Keterlambatan'}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <h4 className="teacher-name">{teacherName}</h4>
                    <div className="total-badge">Total: {filteredDetails.length}</div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Kelas</th>
                                    <th>Jam Ke</th>
                                    <th>Mapel</th>
                                    <th>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDetails.length > 0 ? (
                                    filteredDetails.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.tanggal}</td>
                                            <td>{item.kelas || '-'}</td>
                                            <td>{item.jam_ke || '-'}</td>
                                            <td>{item.mapel || '-'}</td>
                                            <td>{item.keterangan || '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center">Tidak ada data detail.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.2s ease-out;
                }
                .modal-content {
                    background: white;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 700px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #0f172a;
                }
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 2rem;
                    line-height: 1;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .close-btn:hover { color: #ef4444; }

                .modal-body {
                    padding: 24px;
                    overflow-y: auto;
                }
                .teacher-name {
                    font-size: 1.4rem;
                    font-weight: 700;
                    margin: 0 0 8px;
                    color: #1e293b;
                }
                .total-badge {
                    display: inline-block;
                    background: #f1f5f9;
                    padding: 4px 12px;
                    border-radius: 99px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #64748b;
                    margin-bottom: 20px;
                }

                .table-container {
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.9rem;
                }
                th {
                    background: #f8fafc;
                    padding: 12px 16px;
                    text-align: left;
                    font-weight: 600;
                    color: #64748b;
                    border-bottom: 1px solid #e2e8f0;
                }
                td {
                    padding: 12px 16px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                }
                tr:last-child td { border-bottom: none; }
                tr:hover td { background: #f8fafc; }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .text-center { text-align: center; color: #94a3b8; padding: 20px; }
            `}</style>
        </div>
    );
}
