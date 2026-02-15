
'use client';

import React from 'react';

interface Winner {
    nip: string;
    nama: string;
    count: number;
    details: any[];
    rank?: number;
}

export default function LeaderboardList({ list, startIndex, label, onSelect }: { list: Winner[], startIndex: number, label: string, onSelect: (w: Winner) => void }) {
    if (list.length === 0) return null;

    return (
        <div className="list-container">
            {list.map((item, index) => (
                <div key={item.nip} className="list-item" onClick={() => onSelect(item)}>
                    <div className="rank">#{startIndex + index}</div>
                    <div className="avatar">
                        {item.nama.charAt(0)}
                    </div>
                    <div className="details">
                        <div className="name">{item.nama}</div>
                        <div className="bar-container">
                            <div className="bar" style={{ width: `${Math.min(item.count * 10, 100)}%` }}></div>
                        </div>
                    </div>
                    <div className="count-badge">
                        {item.count} <span className="text-xs font-normal opacity-70 ml-1">{label}</span>
                    </div>
                </div>
            ))}

            <style jsx>{`
                .list-container {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 40px;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }
                .list-item {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 12px 16px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    transition: transform 0.2s;
                    cursor: pointer;
                }
                .list-item:hover {
                    transform: translateX(4px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.08);
                    background: #f8fafc;
                }
                .rank {
                    font-weight: 700;
                    color: #9ca3af;
                    width: 30px;
                }
                .avatar {
                    width: 40px;
                    height: 40px;
                    background: #f3f4f6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    color: #6b7280;
                }
                .details {
                    flex: 1;
                }
                .name {
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.95rem;
                }
                .bar-container {
                    height: 6px;
                    background: #f3f4f6;
                    border-radius: 99px;
                    margin-top: 6px;
                    overflow: hidden;
                    width: 100%;
                }
                .bar {
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6, #60a5fa);
                    border-radius: 99px;
                }
                .count-badge {
                    background: #eff6ff;
                    color: #1e40af;
                    padding: 4px 12px;
                    border-radius: 99px;
                    font-weight: 700;
                    font-size: 0.9rem;
                }
            `}</style>
        </div>
    );
}
