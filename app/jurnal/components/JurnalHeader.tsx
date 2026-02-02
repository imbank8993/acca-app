'use client';

export default function JurnalHeader() {
    return (
        <div className="jt__pageHeader">
            <div className="jt__titleArea">
                <h1>Jurnal Pembelajaran</h1>
                <p>Daftar kegiatan belajar mengajar harian</p>
            </div>
            <style jsx>{`
                .jt__pageHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #0038A8;
                    padding: 1.5rem 2.75rem;
                    border-radius: 28px;
                    box-shadow: 0 10px 40px -10px rgba(0, 56, 168, 0.25);
                    position: relative;
                    overflow: hidden;
                    color: white;
                    animation: slideInHeader 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                :global(.dark) .jt__pageHeader {
                    background: #0f172a;
                    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
                }

                @keyframes slideInHeader {
                    from { 
                        opacity: 0; 
                        transform: translateX(-40px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateX(0); 
                    }
                }

                .jt__pageHeader::before {
                    content: '';
                    position: absolute;
                    top: -50%; right: -10%;
                    width: 400px; height: 400px;
                    background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
                    pointer-events: none;
                }

                .jt__pageHeader::after {
                    content: '';
                    position: absolute;
                    bottom: -20%; left: -5%;
                    width: 250px; height: 250px;
                    background: radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 70%);
                    pointer-events: none;
                }

                .jt__titleArea h1 { 
                    font-family: 'Poppins', sans-serif;
                    font-size: 2rem; 
                    font-weight: 750; 
                    color: white !important; 
                    margin: 0; 
                    letter-spacing: -0.01em; 
                    line-height: 1.2;
                }

                .jt__titleArea p { 
                    color: rgba(255, 255, 255, 0.85) !important; 
                    margin: 6px 0 0; 
                    font-size: 0.95rem; 
                    font-weight: 400; 
                    letter-spacing: 0.01em;
                }

                @media (max-width: 768px) {
                  .jt__pageHeader { padding: 16px 20px; border-radius: 20px; flex-direction: column; align-items: flex-start; gap: 10px; }
                  .jt__titleArea h1 { font-size: 1.25rem; font-weight: 800; }
                  .jt__titleArea p { font-size: 0.8rem; margin-top: 2px; opacity: 0.8; }
                }
            `}</style>
        </div>
    );
}
