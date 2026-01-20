'use client'

import { useState } from 'react'
import type { User, PageNode } from '@/lib/types'

interface SidebarProps {
  user: User
  currentPage: string
  onNavigate: (page: string) => void
  isOpen: boolean
  onToggle: () => void
  isCollapsed: boolean
  onCollapse: () => void
}

// Icon mapping
const getMenuIcon = (name: string): string => {
  const key = String(name || '').toLowerCase().trim()

  const icons: Record<string, string> = {
    'dashboard': 'fa-gauge-high',
    'nilai': 'fa-chart-line',
    'lckh': 'fa-book-open',
    'lckh approval': 'fa-circle-check',
    'lckHApproval': 'fa-circle-check',
    'walikelas': 'fa-school',
    'wali kelas': 'fa-school',
    'guruasuh': 'fa-user-tie',
    'guru asuh': 'fa-user-tie',
    'kelas': 'fa-door-open',
    'jurnal': 'fa-file-lines',
    'jurnal guru': 'fa-file-lines',
    'absensi': 'fa-clipboard-check',
    'ketidakhadiran': 'fa-user-xmark',
    'sosialisasi': 'fa-bullhorn',
    'user': 'fa-user-gear',
    'status user': 'fa-user-gear',
    'jadwal guru': 'fa-calendar-days',
    'jadwalguru': 'fa-calendar-days',
    'statussiswa': 'fa-user-clock',
    'status siswa': 'fa-user-clock',
    'rekap data': 'fa-chart-simple',
    'rekap absen&jurnal': 'fa-chart-simple',
    'master data': 'fa-database',
    'export data': 'fa-file-export',
    'layanan guru': 'fa-hands-helping',
    'pengaturan akun': 'fa-gear',
  }

  return icons[key] || 'fa-circle'
}

export default function Sidebar({
  user,
  currentPage,
  onNavigate,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapse
}: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>({})

  const toggleMenu = (index: number) => {
    setOpenMenus(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="brand">
            <img
              src="https://drive.google.com/thumbnail?id=1dB7qVU5MT9HuPgSSLf6ZMIHcQDC6nJh3&sz=w100"
              alt="ACCA Logo"
              className="brand-logo"
            />
            {!isCollapsed && <h2 className="sidebar-title">ACCA</h2>}
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={onCollapse}
            className="toggle-btn"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`fa-solid fa-chevron-${isCollapsed ? 'right' : 'left'}`}></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {(user.pagesTree || []).map((node, index) => {
            const title = node?.title || '-'
            const page = node?.page || ''
            const children = Array.isArray(node?.children) ? node.children : []
            const hasSubmenu = !page && children.length > 0
            const isExpanded = openMenus[index]
            const isActive = page === currentPage

            return (
              <div key={index}>
                {/* Menu Button */}
                <button
                  onClick={() => {
                    if (hasSubmenu) {
                      toggleMenu(index)
                    } else if (page) {
                      onNavigate(page)
                      if (window.innerWidth < 992) {
                        onToggle()
                      }
                    }
                  }}
                  className={`menu-btn ${isActive ? 'active' : ''}`}
                >
                  <div className="menu-content">
                    <i className={`fa-solid ${getMenuIcon(page || title)} menu-icon`}></i>
                    <span className="menu-label">{title}</span>
                  </div>
                  {hasSubmenu && (
                    <i className={`fa-solid fa-chevron-down chevron ${isExpanded ? 'rotate' : ''}`}></i>
                  )}
                </button>

                {/* Submenu */}
                {hasSubmenu && (
                  <div className={`submenu ${isExpanded ? 'open' : ''}`}>
                    {children.map((child, subIndex) => {
                      const childActive = child.page === currentPage
                      return (
                        <button
                          key={subIndex}
                          onClick={() => {
                            if (child.page) {
                              onNavigate(child.page)
                              if (window.innerWidth < 992) {
                                onToggle()
                              }
                            }
                          }}
                          className={`submenu-btn ${childActive ? 'active' : ''}`}
                        >
                          <i className={`fa-solid ${getMenuIcon(child.page || '')} menu-icon`}></i>
                          <span className="menu-label">{child.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Styles */}
      <style jsx>{`
        /* Overlay */
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 40;
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Sidebar Container */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100%;
          width: 256px;
          background: linear-gradient(180deg, #0f1e3d 0%, #0a1628 100%);
          color: white;
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: all 0.3s ease-in-out;
          z-index: 40;
        }

        .sidebar.open {
          transform: translateX(0);
        }

        .sidebar.collapsed {
          width: 70px;
        }

        /* Header */
        .sidebar-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .sidebar-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
          white-space: nowrap;
        }

        /* Toggle Button */
        .toggle-btn {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Collapsed State */
        .sidebar.collapsed .sidebar-header {
          flex-direction: column;
          align-items: center;
          padding: 16px 8px;
        }

        .sidebar.collapsed .brand {
          justify-content: center;
          width: 100%;
        }

        .sidebar.collapsed .toggle-btn {
          display: flex !important;
          margin: 8px auto 0;
        }

        /* Navigation */
        .sidebar-nav {
          margin-top: 24px;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-bottom: 20px;
        }

        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Menu Button */
        .menu-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 24px;
          background: transparent;
          border: none;
          color: white;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .menu-btn:hover {
          background: rgba(30, 64, 117, 0.3);
        }

        .menu-btn.active {
          background: rgba(30, 64, 117, 0.5);
        }

        .menu-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .menu-icon {
          width: 20px;
          height: 20px;
          font-size: 1.25rem;
        }

        .menu-label {
          font-size: 0.875rem;
        }

        .sidebar.collapsed .menu-label {
          display: none;
        }

        .sidebar.collapsed .chevron {
          display: none;
        }

        .sidebar.collapsed .menu-btn {
          justify-content: center;
          padding: 10px;
        }

        .sidebar.collapsed .submenu-btn {
          justify-content: center;
          padding: 10px;
          padding-left: 10px;
        }

        .sidebar.collapsed .submenu {
          padding-left: 0;
        }

        .chevron {
          width: 16px;
          height: 16px;
          font-size: 1rem;
          transition: transform 0.3s;
        }

        .chevron.rotate {
          transform: rotate(180deg);
        }

        /* Submenu */
        .submenu {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-in-out;
        }

        .submenu.open {
          max-height: 160px;
        }

        .submenu-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 24px;
          padding-left: 56px;
          background: transparent;
          border: none;
          color: #9ca3af;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submenu-btn:hover {
          background: rgba(30, 64, 117, 0.3);
          color: white;
        }

        .submenu-btn.active {
          color: white;
        }

        /* Desktop */
        @media (min-width: 992px) {
          .sidebar {
            transform: translateX(0);
          }

          .sidebar-overlay {
            display: none;
          }

          .toggle-btn {
            display: flex;
          }
        }
      `}</style>
    </>
  )
}
