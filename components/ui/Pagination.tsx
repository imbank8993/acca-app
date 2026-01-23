import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    limit: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
}

export default function Pagination({
    currentPage,
    totalPages,
    limit,
    totalItems,
    onPageChange,
    onLimitChange
}: PaginationProps) {
    return (
        <div className="pagination-container">
            <div className="pagination-info">
                <span>
                    Menampilkan {totalItems === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalItems)} dari {totalItems} data
                </span>
            </div>

            <div className="pagination-controls">
                <div className="limit-selector">
                    <label>Baris per hal:</label>
                    <select
                        value={limit}
                        onChange={(e) => onLimitChange(Number(e.target.value))}
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <div className="page-buttons">
                    <button
                        className="btn-page"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>

                    <span className="page-number">
                        Halaman {currentPage} / {totalPages || 1}
                    </span>

                    <button
                        className="btn-page"
                        disabled={currentPage >= totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                    >
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>

            <style jsx>{`
                .pagination-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                    border-radius: 0 0 12px 12px;
                }
                
                .pagination-info {
                    font-size: 0.9rem;
                    color: #4b5563;
                }
                
                .pagination-controls {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                }
                
                .limit-selector {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                    color: #4b5563;
                }
                
                .limit-selector select {
                    padding: 4px 8px;
                    border-radius: 6px;
                    border: 1px solid #d1d5db;
                    outline: none;
                    background: #fff;
                    cursor: pointer;
                }
                
                .page-buttons {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .btn-page {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #d1d5db;
                    background: #fff;
                    border-radius: 6px;
                    cursor: pointer;
                    color: #4b5563;
                    transition: all 0.2s;
                }
                
                .btn-page:hover:not(:disabled) {
                    background: #f3f4f6;
                    color: #111827;
                    border-color: #9ca3af;
                }
                
                .btn-page:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    background: #f3f4f6;
                }
                
                .page-number {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #111827;
                }
            `}</style>
        </div>
    );
}
