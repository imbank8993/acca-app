
'use client';

import React from 'react';

interface Winner {
    nip: string;
    nama: string;
    count: number;
    details: any[];
    rank?: number;
}

export default function MedalPodium({ top3, label, onSelect }: { top3: Winner[], label: string, onSelect: (w: Winner) => void }) {
    if (top3.length === 0) return <div className="text-center p-8 text-gray-500">Belum ada data untuk kategori ini.</div>;

    const [first, second, third] = top3;

    return (
        <div className="podium-container">
            {/* 2nd Place */}
            {second && (
                <div className="podium-item second" onClick={() => onSelect(second)}>
                    <div className="medal silver">2</div>
                    <div className="avatar-circle">
                        {second.nama.charAt(0)}
                    </div>
                    <div className="info">
                        <div className="name">{second.nama}</div>
                        <div className="count-badge">{second.count} {label}</div>
                    </div>
                    <div className="block"></div>
                </div>
            )}

            {/* 1st Place */}
            {first && (
                <div className="podium-item first" onClick={() => onSelect(first)}>
                    <div className="crown-icon">👑</div>
                    <div className="medal gold">1</div>
                    <div className="avatar-circle main">
                        {first.nama.charAt(0)}
                    </div>
                    <div className="info">
                        <div className="name">{first.nama}</div>
                        <div className="count-badge main">{first.count} {label}</div>
                    </div>
                    <div className="block"></div>
                </div>
            )}

            {/* 3rd Place */}
            {third && (
                <div className="podium-item third" onClick={() => onSelect(third)}>
                    <div className="medal bronze">3</div>
                    <div className="avatar-circle">
                        {third.nama.charAt(0)}
                    </div>
                    <div className="info">
                        <div className="name">{third.nama}</div>
                        <div className="count-badge">{third.count} {label}</div>
                    </div>
                    <div className="block"></div>
                </div>
            )}

            <style jsx>{`
                .podium-container {
                    display: flex;
                    justify-content: center;
                    align-items: flex-end;
                    gap: 40px; /* Increased gap */
                    margin: 30px 0 160px; /* Increased top margin for gap between badge and podium */
                    min-height: 250px; /* Reduced min-height to prevent huge top gap */
                }
                .podium-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                    width: 150px; /* Slightly wider */
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                /* ... z-indexes ... */
                .first { z-index: 3; }
                .second { z-index: 2; }
                .third { z-index: 1; }

                /* ... avatar circles ... */
                .avatar-circle {
                    width: 60px;
                    height: 60px;
                    background: #e0f2fe;
                    color: #0284c7;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1.5rem;
                    border: 4px solid white;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    margin-bottom: -30px;
                    z-index: 5;
                    position: relative;
                }
                .avatar-circle.main {
                    width: 80px;
                    height: 80px;
                    font-size: 2rem;
                    background: #fef9c3;
                    color: #ca8a04;
                    margin-bottom: -40px;
                }

                /* ... blocks ... */
                .block {
                    width: 100%;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                    background: linear-gradient(to bottom, #f3f4f6, #e5e7eb);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }
                .first .block { height: 180px; background: linear-gradient(135deg, #FFD700 0%, #FDB931 100%); }
                .second .block { height: 130px; background: linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%); }
                .third .block { height: 90px; background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%); }

                .info {
                    text-align: center;
                    margin-bottom: 20px;
                    position: absolute;
                    bottom: -110px; /* Moved further down */
                    width: 180px; /* Wider to fit names */
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .name {
                    font-weight: 600;
                    color: #1f2937;
                    font-size: 0.85rem;
                    line-height: 1.3;
                    margin-bottom: 8px; /* More space between name and badge */
                    min-height: 2.6em;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .count-badge {
                    font-size: 0.75rem;
                    color: white;
                    background: #64748b;
                    padding: 4px 10px;
                    border-radius: 99px;
                    font-weight: 600;
                }
                .count-badge.main {
                    background: #ca8a04; /* Matches gold theme better */
                }

                .medal {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: white;
                    position: absolute;
                    top: 0;
                    right: 0;
                    font-size: 0.9rem;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    z-index: 10;
                }
                .gold { background: #FFD700; border: 2px solid white; }
                .silver { background: #C0C0C0; border: 2px solid white; }
                .bronze { background: #CD7F32; border: 2px solid white; }

                .crown-icon {
                    position: absolute;
                    top: -40px;
                    font-size: 2rem;
                    animation: float 3s ease-in-out infinite;
                }

                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }

                @media (max-width: 640px) {
                    .podium-container { gap: 8px; transform: scale(0.9); }
                }
            `}</style>
        </div>
    );
}
