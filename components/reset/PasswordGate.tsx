'use client'

import { useState, useEffect } from 'react'

interface PasswordGateProps {
    onSuccess: () => void;
}

export default function PasswordGate({ onSuccess }: PasswordGateProps) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (password === 'admin123') {
            onSuccess()
        } else {
            setError(true)
            setPassword('')
        }
    }

    return (
        <div className="password-gate-container">
            <style jsx>{`
                .password-gate-container {
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, rgba(254, 242, 242, 0.4), rgba(255, 251, 235, 0.3));
                    padding: 4rem 2rem 2rem 2rem;
                }

                .password-gate-card {
                    width: 100%;
                    max-width: 28rem;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(239, 68, 68, 0.1);
                    border-radius: 20px;
                    padding: 2.5rem;
                    box-shadow: 0 20px 40px rgba(239, 68, 68, 0.1);
                    position: relative;
                    overflow: hidden;
                }

                .password-gate-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8));
                }

                .header-section {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .icon-container {
                    width: 5rem;
                    height: 5rem;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    position: relative;
                    transition: all 0.3s ease;
                }

                .icon-container::after {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1));
                    z-index: -1;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .password-gate-card:hover .icon-container::after {
                    opacity: 1;
                }

                .icon-container i {
                    font-size: 2.5rem;
                    color: rgba(239, 68, 68, 0.8);
                    transition: all 0.3s ease;
                }

                .password-gate-card:hover .icon-container i {
                    color: rgba(220, 38, 38, 0.9);
                    transform: scale(1.05);
                }

                .title {
                    font-size: 1.875rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin-bottom: 0.5rem;
                }

                .subtitle {
                    color: rgba(107, 114, 128, 0.8);
                    font-size: 0.95rem;
                    font-weight: 500;
                    line-height: 1.5;
                    margin: 0;
                }

                .form-section {
                    margin-top: 2rem;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: rgba(31, 41, 55, 0.9);
                    margin-bottom: 0.5rem;
                }

                .form-input {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.8);
                    color: rgba(31, 41, 55, 0.9);
                    font-size: 0.95rem;
                    outline: none;
                    transition: all 0.3s ease;
                    font-weight: 500;
                }

                .form-input::placeholder {
                    color: rgba(107, 114, 128, 0.6);
                }

                .form-input:focus {
                    border-color: rgba(239, 68, 68, 0.4);
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                    background: rgba(255, 255, 255, 0.95);
                }

                .error-message {
                    font-size: 0.75rem;
                    color: rgba(239, 68, 68, 0.8);
                    margin-top: 0.5rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .error-message::before {
                    content: '⚠️';
                }

                .submit-button {
                    width: 100%;
                    padding: 0.875rem 1.5rem;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8));
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .submit-button::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                    transition: left 0.5s;
                }

                .submit-button:hover::before {
                    left: 100%;
                }

                .submit-button:hover {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
                    transform: translateY(-1px);
                    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.2);
                }

                .submit-button:active {
                    transform: translateY(0);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
                }

                @media (max-width: 640px) {
                    .password-gate-container {
                        padding: 1rem;
                    }

                    .password-gate-card {
                        padding: 2rem;
                        max-width: 100%;
                    }

                    .title {
                        font-size: 1.5rem;
                    }

                    .icon-container {
                        width: 4rem;
                        height: 4rem;
                    }

                    .icon-container i {
                        font-size: 2rem;
                    }
                }
            `}</style>

            <div className="password-gate-card">
                <div className="header-section">
                    <div className="icon-container">
                        <i className="bi bi-shield-lock-fill"></i>
                    </div>
                    <h2 className="title">Restricted Access</h2>
                    <p className="subtitle">
                        Halaman ini khusus untuk Administrator. Masukkan password untuk melanjutkan.
                    </p>
                </div>

                <form className="form-section" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setError(false)
                            }}
                            autoFocus
                        />
                        {error && <p className="error-message">Password salah.</p>}
                    </div>
                    <button
                        type="submit"
                        className="submit-button"
                    >
                        <i className="bi bi-box-arrow-in-right mr-2"></i>
                         Masuk
                    </button>
                </form>
            </div>
        </div>
    )
}
