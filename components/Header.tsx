'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'

interface HeaderProps {
    user: User
    onMenuToggle: () => void
    isCollapsed: boolean
}

export default function Header({ user, onMenuToggle, isCollapsed }: HeaderProps) {
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [isDarkMode, setIsDarkMode] = useState(false)

    // Load dark mode preference on mount
    useEffect(() => {
        const savedMode = localStorage.getItem('darkMode') === 'true'
        setIsDarkMode(savedMode)
        if (savedMode) {
            document.documentElement.classList.add('dark')
        }
    }, [])

    const toggleDarkMode = () => {
        const newMode = !isDarkMode
        setIsDarkMode(newMode)
        localStorage.setItem('darkMode', String(newMode))

        if (newMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const handleLogout = async () => {
        const { supabase } = await import('@/lib/supabase')
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <>
            <header className={`header ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="header-left">
                    <button className="menu-toggle" onClick={onMenuToggle}>
                        <i className="bi bi-list"></i>
                    </button>
                    <div className="header-title-wrapper">
                        <h1 className="header-title">Academic Center & Access</h1>
                        <p className="header-subtitle">MAN Insan Cendekia Gowa</p>
                    </div>
                </div>

                <div className="header-right">
                    {/* Dark Mode Toggle */}
                    <button
                        className="dark-mode-toggle"
                        onClick={toggleDarkMode}
                        title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    >
                        <i className={`bi bi-${isDarkMode ? 'sun' : 'moon'}-fill`}></i>
                    </button>

                    <div className="user-menu-wrapper">
                        <button
                            className="user-menu-trigger"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                        >
                            <div className="user-avatar-small">
                                {user.photoUrl ? (
                                    <img src={user.photoUrl} alt={user.nama} />
                                ) : (
                                    <i className="bi bi-person-circle"></i>
                                )}
                            </div>
                            <div className="user-info-header">
                                <span className="user-name-header">{user.nama}</span>
                                <span className="user-role-header">{user.roles[0]}</span>
                            </div>
                            <i className={`bi bi-chevron-${showUserMenu ? 'up' : 'down'} chevron-header`}></i>
                        </button>

                        {showUserMenu && (
                            <>
                                <div
                                    className="user-menu-overlay"
                                    onClick={() => setShowUserMenu(false)}
                                />
                                <div className="user-menu-dropdown">
                                    <div className="user-menu-info">
                                        <div className="user-menu-name">{user.nama}</div>
                                        <div className="user-menu-email">{user.username}</div>
                                        <div className="user-menu-role">{user.roles.join(', ')}</div>
                                    </div>
                                    <div className="user-menu-divider" />
                                    <button className="user-menu-item" onClick={handleLogout}>
                                        <i className="bi bi-box-arrow-right"></i>
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <style jsx>{`
        .header {
          position: fixed;
          top: 0;
          left: 260px;
          right: 0;
          height: 65px;
          background: #fff;
          border-bottom: 2px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 900;
          transition: left 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .header.collapsed {
          left: 70px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .menu-toggle {
          display: none;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #0b1b3a;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .menu-toggle:hover {
          background: #f3f4f6;
        }

        .header-title-wrapper {
          display: flex;
          flex-direction: column;
        }

        .header-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0b1b3a;
          margin: 0;
          line-height: 1.3;
        }

        .header-subtitle {
          font-size: 0.8rem;
          color: #6b7280;
          margin: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .dark-mode-toggle {
          width: 42px;
          height: 42px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #0b1b3a;
          font-size: 1.2rem;
        }

        .dark-mode-toggle:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
          transform: scale(1.05);
        }

        .dark-mode-toggle:active {
          transform: scale(0.95);
        }

        .user-menu-wrapper {
          position: relative;
        }

        .user-menu-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 6px 12px 6px 6px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .user-menu-trigger:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .user-avatar-small {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(58, 166, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .user-avatar-small i {
          font-size: 1.6rem;
          color: #3aa6ff;
        }

        .user-avatar-small img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-info-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .user-name-header {
          font-weight: 600;
          color: #0b1b3a;
          font-size: 0.9rem;
          line-height: 1.2;
        }

        .user-role-header {
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1.2;
        }

        .chevron-header {
          color: #9ca3af;
          font-size: 0.8rem;
        }

        .user-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 899;
        }

        .user-menu-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 260px;
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          z-index: 900;
          overflow: hidden;
        }

        .user-menu-info {
          padding: 18px;
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          border-bottom: 1px solid #e5e7eb;
        }

        .user-menu-name {
          font-weight: 700;
          color: #0b1b3a;
          font-size: 1rem;
          margin-bottom: 4px;
        }

        .user-menu-email {
          font-size: 0.85rem;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .user-menu-role {
          font-size: 0.8rem;
          color: #3aa6ff;
          font-weight: 600;
        }

        .user-menu-divider {
          height: 1px;
          background: #e5e7eb;
        }

        .user-menu-item {
          width: 100%;
          padding: 14px 18px;
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: background 0.2s;
          color: #0b1b3a;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .user-menu-item:hover {
          background: #fef2f2;
        }

        .user-menu-item i {
          font-size: 1.1rem;
          color: #ef4444;
        }

        @media (max-width: 992px) {
          .header {
            left: 0;
          }

          .header.collapsed {
            left: 0;
          }

          .menu-toggle {
            display: block;
          }

          .header-title {
            font-size: 1rem;
          }

          .header-subtitle {
            display: none;
          }

          .user-info-header {
            display: none;
          }

          .user-menu-trigger {
            padding: 6px;
          }
        }
      `}</style>
        </>
    )
}
