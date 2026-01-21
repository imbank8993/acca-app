'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'
import './header.css'

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
  )
}
