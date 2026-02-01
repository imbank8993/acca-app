'use client'

import React, { useState } from 'react'
import type { User, PageNode } from '@/lib/types'
import './sidebar.css'

interface SidebarProps {
  user: User
  currentPage: string
  onNavigate: (page: string) => void
  isOpen: boolean
  onToggle: () => void
  isCollapsed: boolean
  onCollapse: () => void
}

const getMenuIcon = (path: string) => {
  const p = path.toLowerCase()
  if (p.includes('dashboard')) return 'fa-chart-pie'
  if (p.includes('jurnal')) return 'fa-book'
  if (p.includes('absensi')) return 'fa-clipboard-user'
  if (p.includes('nilai')) return 'fa-graduation-cap'
  if (p.includes('lckh')) return 'fa-file-signature'
  if (p.includes('konfigurasi') || p.includes('master') || p.includes('pengaturan')) return 'fa-gear'
  if (p.includes('jadwal')) return 'fa-calendar-days'
  if (p.includes('user')) return 'fa-user-group'
  if (p.includes('rekap')) return 'fa-chart-line'
  if (p.includes('status')) return 'fa-user-check'
  return 'fa-folder'
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
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (index: number) => {
    if (!isCollapsed) return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHoveredIdx(index)
  }

  const handleMouseLeave = () => {
    if (!isCollapsed) return
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredIdx(null)
    }, 150) // 150ms grace period
  }

  const toggleSubmenu = (title: string) => {
    if (expandedMenus.includes(title)) {
      setExpandedMenus(expandedMenus.filter(m => m !== title))
    } else {
      setExpandedMenus([...expandedMenus, title])
    }
  }

  const isMenuExpanded = (title: string) => expandedMenus.includes(title)

  const handleMenuClick = (item: PageNode) => {
    if (item.children && item.children.length > 0) {
      toggleSubmenu(item.title)
    } else if (item.page) {
      onNavigate(item.page)
      if (window.innerWidth < 992) {
        onToggle()
      }
    }
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onToggle}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-logo-placeholder">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            {!isCollapsed && <h1 className="sidebar-title">ACCA</h1>}
          </div>
          <button className="collapse-toggle" onClick={onCollapse}>
            <i className={`fa-solid fa-chevron-${isCollapsed ? 'right' : 'left'}`}></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          {user.pagesTree?.map((item, index) => {
            const { title, page, children } = item
            const hasSubmenu = children && children.length > 0
            const isActive = page === currentPage || (children?.some(c => c.page === currentPage))
            const isExpanded = isMenuExpanded(title)

            return (
              <div
                key={index}
                className="menu-group"
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Menu Button */}
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`menu-btn ${isActive ? 'active' : ''} ${hasSubmenu && isExpanded ? 'expanded' : ''}`}
                >
                  <div className="menu-content">
                    <i className={`fa-solid ${getMenuIcon(page || title)} menu-icon`}></i>
                    {!isCollapsed && <span className="menu-label">{title}</span>}
                  </div>
                  {!isCollapsed && hasSubmenu && (
                    <i className={`fa-solid fa-chevron-down chevron ${isExpanded ? 'rotate' : ''}`}></i>
                  )}
                </button>

                {/* Submenu (Visible normally) */}
                {!isCollapsed && hasSubmenu && (
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
                          <span className="menu-label">{child.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Tooltip/Popover for Collapsed State */}
                {isCollapsed && hoveredIdx === index && (
                  <div
                    className="sidebar-tooltip"
                    onMouseEnter={() => handleMouseEnter(index)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {!hasSubmenu ? (
                      <button
                        onClick={() => handleMenuClick(item)}
                        className={`tooltip-sub-btn ${isActive ? 'active' : ''}`}
                      >
                        {title}
                      </button>
                    ) : (
                      <div className="tooltip-submenu">
                        {children.map((child, subIndex) => (
                          <button
                            key={subIndex}
                            onClick={() => {
                              if (child.page) {
                                onNavigate(child.page)
                              }
                            }}
                            className={`tooltip-sub-btn ${child.page === currentPage ? 'active' : ''}`}
                          >
                            {child.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
