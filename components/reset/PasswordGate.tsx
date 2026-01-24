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
        <div className="flex items-center justify-center min-h-[60vh] bg-red-50 rounded-xl border border-red-100 p-8">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="bi bi-shield-lock text-3xl text-red-600"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Restricted Access</h2>
                    <p className="text-sm text-gray-500 mt-2">
                        Halaman ini khusus untuk Administrator. Masukkan password untuk melanjutkan.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setError(false)
                            }}
                            autoFocus
                        />
                        {error && <p className="text-xs text-red-600 mt-1">Password salah.</p>}
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors"
                    >
                        Masuk
                    </button>
                </form>
            </div>
        </div>
    )
}
