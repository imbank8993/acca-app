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
                :global(:root) {
                    --pagination-line: rgba(148, 163, 184, 0.22);
                    --pagination-card: rgba(255, 255, 255, 0.92);
                    --pagination-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
                    --pagination-shadow2: 0 10px 22px rgba(2, 6, 23, 0.08);
                    --pagination-radius: 16px;
                    --pagination-fs: 0.88rem;
                    --pagination-fs-sm: 0.82rem;
                }

                .pagination-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    border-top: 1px solid var(--pagination-line);
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
                    border-radius: 0 0 var(--pagination-radius) var(--pagination-radius);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }

                .pagination-info {
                    font-size: var(--pagination-fs-sm);
                    color: rgba(100, 116, 139, 0.9);
                    font-weight: 500;
                }

                .pagination-controls {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .limit-selector {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: var(--pagination-fs-sm);
                    color: rgba(100, 116, 139, 0.9);
                    font-weight: 600;
                }

                .limit-selector select {
                    padding: 6px 10px;
                    border-radius: 10px;
                    border: 1px solid var(--pagination-line);
                    outline: none;
                    background: rgba(255, 255, 255, 0.9);
                    color: rgba(15, 23, 42, 0.9);
                    cursor: pointer;
                    font-weight: 550;
                    font-size: var(--pagination-fs-sm);
                    transition: all 0.2s ease;
                    box-shadow: var(--pagination-shadow2);
                }

                .limit-selector select:focus {
                    border-color: rgba(58, 166, 255, 0.55);
                    box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
                }

                .page-buttons {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-page {
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--pagination-line);
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 12px;
                    cursor: pointer;
                    color: rgba(7, 22, 46, 0.9);
                    font-size: 1rem;
                    transition: all 0.2s ease;
                    box-shadow: var(--pagination-shadow2);
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                }

                .btn-page:hover:not(:disabled) {
                    background: rgba(58, 166, 255, 0.1);
                    color: rgba(58, 166, 255, 1);
                    border-color: rgba(58, 166, 255, 0.3);
                    transform: translateY(-1px);
                    box-shadow: var(--pagination-shadow);
                }

                .btn-page:active:not(:disabled) {
                    transform: translateY(0);
                }

                .btn-page:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    background: rgba(248, 250, 252, 0.8);
                    transform: none;
                    box-shadow: none;
                }

                .page-number {
                    font-size: var(--pagination-fs-sm);
                    font-weight: 650;
                    color: rgba(7, 22, 46, 0.95);
                    padding: 0 12px;
                    white-space: nowrap;
                    letter-spacing: 0.01em;
                }

                /* Mobile responsive */
                @media (max-width: 768px) {
                    .pagination-container {
                        flex-direction: column;
                        gap: 12px;
                        padding: 16px 20px;
                        align-items: stretch;
                    }

                    .pagination-controls {
                        justify-content: space-between;
                        gap: 12px;
                    }

                    .limit-selector {
                        font-size: var(--pagination-fs);
                    }

                    .page-number {
                        font-size: var(--pagination-fs);
                        padding: 0 8px;
                    }
                }

                @media (max-width: 480px) {
                    .pagination-container {
                        padding: 12px 16px;
                    }

                    .pagination-info {
                        text-align: center;
                        font-size: var(--pagination-fs);
                    }

                    .pagination-controls {
                        flex-direction: column;
                        gap: 8px;
                    }

                    .limit-selector {
                        justify-content: center;
                    }

                    .page-buttons {
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
}
