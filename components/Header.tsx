'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/lib/types'
import './header.css'
import './notification-dropdown.css'
import './notification-note.css'

interface HeaderProps {
  user: User
  onMenuToggle: () => void
  onNavigate: (page: string) => void
  isCollapsed: boolean
}

export default function Header({ user, onMenuToggle, onNavigate, isCollapsed }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [pendingLckhCount, setPendingLckhCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [pendingList, setPendingList] = useState<any[]>([])
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set())
  const [unreadCount, setUnreadCount] = useState(0)

  // Load read notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lckh-read-notifications')
    if (stored) {
      setReadNotifications(new Set(JSON.parse(stored)))
    }
  }, [])

  // Update unread count when list changes
  useEffect(() => {
    const unread = pendingList.filter(item => !readNotifications.has(item.id)).length
    setUnreadCount(unread)
  }, [pendingList, readNotifications])

  // Load dark mode preference on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true'
    setIsDarkMode(savedMode)
    if (savedMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Fetch pending LCKH count for Waka/Kamad
  useEffect(() => {
    const fetchPendingCount = async () => {
      // Check if user has Waka or Kamad role
      const isWaka = user.roles.some(r => r.toUpperCase().includes('WAKA'))
      const isKamad = user.roles.some(r => r.toUpperCase().includes('KAMAD'))

      const { supabase } = await import('@/lib/supabase')
      let allNotifications: any[] = []

      // Fetch approval notifications for Waka/Kamad (exclude own submissions)
      if (isWaka || isKamad) {
        const statusFilter = isKamad ? 'Approved_Waka' : 'Submitted'

        const { data, error } = await supabase
          .from('lckh_submissions')
          .select('id, nip, nama_guru_snap, periode_kode, status, submitted_at, updated_at, catatan_reviewer')
          .eq('status', statusFilter)
          .neq('nip', user.nip) // Exclude own submissions by NIP
          .order('submitted_at', { ascending: false })

        if (!error && data) {
          allNotifications = data.map(item => ({
            ...item,
            notification_type: 'approval_needed'
          }))
        }
      }

      // Fetch status change notifications for teachers (their own submissions by NIP)
      // Show if status is Revisi, Approved_Waka, or Approved_Kamad
      const { data: teacherData, error: teacherError } = await supabase
        .from('lckh_submissions')
        .select('id, nip, nama_guru_snap, periode_kode, status, submitted_at, updated_at, catatan_reviewer')
        .eq('nip', user.nip) // Match by NIP
        .in('status', ['Revisi', 'Approved_Waka', 'Approved_Kamad'])
        .order('updated_at', { ascending: false })

      if (!teacherError && teacherData) {
        const teacherNotifications = teacherData.map(item => ({
          ...item,
          notification_type: item.status === 'Revisi' ? 'revision_needed' : 'approved'
        }))
        allNotifications = [...allNotifications, ...teacherNotifications]
      }

      // Sort by most recent
      allNotifications.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.submitted_at).getTime()
        const dateB = new Date(b.updated_at || b.submitted_at).getTime()
        return dateB - dateA
      })

      setPendingLckhCount(allNotifications.length)
      setPendingList(allNotifications)
    }

    fetchPendingCount()

    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000)

    // Listen for manual refresh event from LCKH Approval page
    const handleRefreshNotification = () => {
      fetchPendingCount()
    }
    window.addEventListener('refresh-lckh-notification', handleRefreshNotification)

    return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-lckh-notification', handleRefreshNotification)
    }
  }, [user.roles])

  const markAsRead = (id: string) => {
    const newReadSet = new Set(readNotifications)
    newReadSet.add(id)
    setReadNotifications(newReadSet)
    localStorage.setItem('lckh-read-notifications', JSON.stringify(Array.from(newReadSet)))
  }

  const markAllAsRead = () => {
    const allIds = pendingList.map(item => item.id)
    const newReadSet = new Set([...readNotifications, ...allIds])
    setReadNotifications(newReadSet)
    localStorage.setItem('lckh-read-notifications', JSON.stringify(Array.from(newReadSet)))
  }

  // Clean up old read notifications that are no longer in pending list
  useEffect(() => {
    const currentIds = pendingList.map(item => item.id)
    const cleanedRead = Array.from(readNotifications).filter(id =>
      currentIds.includes(id)
    )
    if (cleanedRead.length !== readNotifications.size) {
      setReadNotifications(new Set(cleanedRead))
      localStorage.setItem('lckh-read-notifications', JSON.stringify(cleanedRead))
    }
  }, [pendingList])

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
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="header-title-wrapper">
          <h1 className="header-title">
            Academic Center <span>& Access</span>
          </h1>
          <span className="header-subtitle">MAN Insan Cendekia Gowa</span>
        </div>
      </div>

      <div className="header-right">
        {/* LCKH Notifications */}
        <div className="notification-wrapper">
          <button
            className="notification-bell"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <i className="bi bi-bell-fill"></i>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="notification-overlay"
                onClick={() => setShowNotifications(false)}
              />
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Persetujuan LCKH</h3>
                  <span className="notification-count">{pendingLckhCount} Laporan</span>
                </div>
                <div className="notification-list">
                  {pendingList.length > 0 ? (
                    pendingList.map((item) => {
                      const isRead = readNotifications.has(item.id)
                      const notifType = item.notification_type || 'approval_needed'

                      // Determine icon and color based on type
                      let iconClass = 'bi-file-earmark-text-fill'
                      let iconColorClass = isRead ? 'notification-icon-read' : 'notification-icon-unread'
                      let titlePrefix = ''

                      if (notifType === 'revision_needed') {
                        iconClass = 'bi-exclamation-circle-fill'
                        iconColorClass = isRead ? 'notification-icon-read' : 'notification-icon-revision'
                        titlePrefix = '🔴 Revisi - '
                      } else if (notifType === 'approved') {
                        iconClass = 'bi-check-circle-fill'
                        iconColorClass = isRead ? 'notification-icon-read' : 'notification-icon-approved'
                        titlePrefix = '✅ Disetujui - '
                      } else {
                        titlePrefix = '📋 Perlu Approval - '
                      }

                      return (
                        <div
                          key={item.id}
                          className={`notification-item ${isRead ? 'notification-read' : 'notification-unread'}`}
                          onClick={() => {
                            markAsRead(item.id)
                            setShowNotifications(false)
                            // Navigate to appropriate page
                            if (notifType === 'approval_needed') {
                              onNavigate('lckh-approval')
                            } else {
                              onNavigate('lckh')
                            }
                          }}
                        >
                          <div className={`notification-icon ${iconColorClass}`}>
                            <i className={iconClass}></i>
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">
                              <i className="bi bi-person-circle"></i> {item.nama_guru_snap}
                            </div>
                            <div className="notification-subtitle">
                              {notifType === 'revision_needed' && (
                                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                  🔴 Perlu Revisi
                                </span>
                              )}
                              {notifType === 'approved' && (
                                <span style={{ color: '#10b981', fontWeight: 700 }}>
                                  ✅ Disetujui
                                </span>
                              )}
                              {notifType === 'approval_needed' && (
                                <span style={{ color: '#3b82f6', fontWeight: 700 }}>
                                  📋 Menunggu Persetujuan
                                </span>
                              )}
                            </div>
                            {item.nip && (
                              <div className="notification-nip">
                                <i className="bi bi-person-badge"></i> NIP: {item.nip}
                              </div>
                            )}
                            <div className="notification-subtitle">
                              <i className="bi bi-calendar3"></i>
                              Periode: {item.periode_kode}
                            </div>
                            {item.catatan_reviewer && (
                              <div className="notification-note">
                                <i className="bi bi-chat-left-text"></i>
                                {item.catatan_reviewer.substring(0, 50)}...
                              </div>
                            )}
                            <div className="notification-time">
                              <i className="bi bi-clock"></i>
                              {new Date(item.submitted_at || item.updated_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <div className="notification-arrow">
                            <i className="bi bi-chevron-right"></i>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="notification-empty">
                      <i className="bi bi-check-circle"></i>
                      <p>Tidak ada LCKH pending</p>
                    </div>
                  )}
                </div>
                <div className="notification-footer">
                  <button
                    onClick={() => {
                      setShowNotifications(false)
                      onNavigate('lckh-approval')
                    }}
                    className="notification-view-all"
                  >
                    Lihat Semua
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          className="dark-mode-toggle"
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
        >
          <i className={`fa-solid fa-${isDarkMode ? 'sun' : 'moon'}`}></i>
        </button>

        {/* User Menu trigger */}
        <div className="user-menu-wrapper">
          <button
            className="user-menu-trigger"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar-small">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.nama} />
              ) : (
                <i className="fa-solid fa-user"></i>
              )}
            </div>
            <div className="user-info-header">
              <span className="user-name-header">{user.nama}</span>
              <span className="user-role-header">{user.roles[0] || 'User'}</span>
            </div>
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
                  <div className="user-menu-role">{user.roles.join(', ')}</div>
                </div>
                <button className="user-menu-item" onClick={() => { onNavigate('ProfileSaya'); setShowUserMenu(false); }}>
                  <i className="bi bi-person-bounding-box"></i>
                  <span>Profil & Keamanan</span>
                </button>
                <div style={{ borderTop: '1px solid var(--header-border)', margin: '4px 0' }}></div>
                <button className="user-menu-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
                  <i className="fa-solid fa-right-from-bracket"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
