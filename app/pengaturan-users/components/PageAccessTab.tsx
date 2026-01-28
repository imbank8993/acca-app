'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { User } from '@/lib/types'
import { formatRoleDisplay } from '@/lib/auth'

interface PageOption {
  title: string;
  page?: string;
  children?: { title: string; page: string }[];
}

interface Selection {
  parent: string;
  children: string[];
}

export default function PageAccessTab() {
  const [users, setUsers] = useState<User[]>([])
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pagesText, setPagesText] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingRoles, setSavingRoles] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // UI States
  const [searchQuery, setSearchQuery] = useState('')
  const [showParentDropdown, setShowParentDropdown] = useState(false)
  const [activeSubSearchId, setActiveSubSearchId] = useState<string | null>(null)
  const [subSearchQuery, setSubSearchQuery] = useState('')

  // Custom Page Modal
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customPage, setCustomPage] = useState({ title: '', page: '', isSub: false, parentTarget: '', parentIdx: -1 })

  const parentSearchRef = useRef<HTMLDivElement>(null)

  const availablePages: PageOption[] = [
    { title: 'Dashboard', page: 'Dashboard' },
    {
      title: 'Absensi',
      children: [
        { title: 'Absensi Guru', page: 'AbsensiSiswa' },
        { title: 'Absensi Siswa', page: 'AbsensiSiswa' },
        { title: 'Export Absensi', page: 'ExportAbsensi' }
      ]
    },
    {
      title: 'Jurnal',
      children: [
        { title: 'Jurnal Guru', page: 'JurnalGuru' },
        { title: 'Pengaturan Jurnal', page: 'jurnal/pengaturan' },
        { title: 'Export Jurnal', page: 'ExportJurnal' }
      ]
    },
    {
      title: 'LCKH',
      children: [
        { title: 'Data LCKH', page: 'LCKH' },
        { title: 'Persetujuan LCKH', page: 'LCKHApproval' }
      ]
    },
    { title: 'Nilai', page: 'Nilai' },
    { title: 'Wali Kelas', page: 'WaliKelas' },
    { title: 'Guru Asuh', page: 'GuruAsuh' },
    { title: 'Jadwal Guru', page: 'JadwalGuru' },
    { title: 'Layanan Guru', page: 'Layanan Guru' },
    { title: 'Ketidakhadiran', page: 'Ketidakhadiran' },
    { title: 'Sosialisasi', page: 'Sosialisasi' },
    { title: 'Status Siswa', page: 'StatusSiswa' },
    {
      title: 'Rekap Data',
      children: [
        { title: 'Rekap Absensi', page: 'RekapAbsensi' },
        { title: 'Rekap Jurnal', page: 'RekapJurnal' }
      ]
    },
    { title: 'Master Data', page: 'Master Data' },
    { title: 'Pengaturan Data', page: 'Pengaturan Data' },
    { title: 'Pengaturan Users', page: 'pengaturan-users' },
    { title: 'Pengaturan Akun', page: 'User' },
    { title: 'Reset Data', page: 'Reset Data' }
  ]

  useEffect(() => {
    fetchUsers()
    fetchRoles()

    const handleClickOutside = (e: MouseEvent) => {
      if (parentSearchRef.current && !parentSearchRef.current.contains(e.target as Node)) {
        setShowParentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      const json = await res.json()
      if (json.ok) {
        setAvailableRoles(json.data.map((r: any) => r.name))
      }
    } catch (e) {
      console.error('Error fetching roles:', e)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.ok) setUsers(data.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetail(selectedUserId)
    } else {
      setSelectedUser(null)
      setPagesText('')
      setSelectedRoles([])
    }
  }, [selectedUserId])

  const fetchUserDetail = async (userId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const data = await res.json()
      if (data.ok && data.data) {
        setSelectedUser(data.data)
        setPagesText(data.data.pages || '')
        setSelectedRoles(data.data.roles || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentSelections = useMemo(() => {
    if (!pagesText) return []
    return pagesText.split(',').map(item => {
      if (item.includes('>')) {
        const [parent, childrenStr] = item.split('>')
        return {
          parent: parent.trim(),
          children: childrenStr.split('|').map(c => c.trim())
        }
      }
      return { parent: item.trim(), children: [] }
    })
  }, [pagesText])

  const updatePagesString = (selections: Selection[]) => {
    const formatItem = (itemStr: string) => {
      if (itemStr.includes('=')) return itemStr;
      const findOriginal = (title: string, items: any[]): PageOption | undefined => {
        for (const item of items) {
          if (item.title === title) return item;
          if (item.children) {
            const found = findOriginal(title, item.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      const opt = findOriginal(itemStr, availablePages);
      if (opt && opt.page && opt.page !== opt.title) return `${opt.title}=${opt.page}`;
      return itemStr;
    };
    const newText = selections.map(s => {
      const p = formatItem(s.parent);
      if (s.children.length > 0) {
        const c = s.children.map(child => formatItem(child)).join('|');
        return `${p}>${c}`;
      }
      return p;
    }).join(',');
    setPagesText(newText);
  }

  const addParentPage = (option: PageOption | { title: string, page?: string }) => {
    if (!currentSelections.some(s => s.parent.split('=')[0] === option.title)) {
      const title = option.page && option.page !== option.title ? `${option.title}=${option.page}` : option.title;
      updatePagesString([...currentSelections, { parent: title, children: [] }])
    }
    setSearchQuery('')
    setShowParentDropdown(false)
  }

  const addChildPage = (parentIdx: number, item: string) => {
    const newSelections = [...currentSelections];
    if (!newSelections[parentIdx].children.includes(item)) {
      newSelections[parentIdx].children.push(item);
      updatePagesString(newSelections);
    }
    setSubSearchQuery('')
    setActiveSubSearchId(null)
  }

  const removeParent = (idx: number) => {
    const newSelections = [...currentSelections];
    newSelections.splice(idx, 1);
    updatePagesString(newSelections);
  }

  const removeChild = (pIdx: number, cIdx: number) => {
    const newSelections = [...currentSelections];
    newSelections[pIdx].children.splice(cIdx, 1);
    updatePagesString(newSelections);
  }

  const moveParent = (idx: number, direction: 'up' | 'down') => {
    const newSelections = [...currentSelections];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newSelections.length) return;
    [newSelections[idx], newSelections[targetIdx]] = [newSelections[targetIdx], newSelections[idx]];
    updatePagesString(newSelections);
  }

  const moveSub = (pIdx: number, cIdx: number, direction: 'up' | 'down') => {
    const newSelections = [...currentSelections];
    const targetIdx = direction === 'up' ? cIdx - 1 : cIdx + 1;
    if (targetIdx < 0 || targetIdx >= newSelections[pIdx].children.length) return;
    [newSelections[pIdx].children[cIdx], newSelections[pIdx].children[targetIdx]] =
      [newSelections[pIdx].children[targetIdx], newSelections[pIdx].children[cIdx]];
    updatePagesString(newSelections);
  }

  const handleAddCustom = () => {
    if (!customPage.title) return;
    if (customPage.isSub) {
      if (customPage.parentIdx !== -1) {
        const item = customPage.page ? `${customPage.title}=${customPage.page}` : customPage.title;
        addChildPage(customPage.parentIdx, item);
      }
    } else {
      addParentPage({ title: customPage.title, page: customPage.page });
    }
    setShowCustomModal(false);
    setCustomPage({ title: '', page: '', isSub: false, parentTarget: '', parentIdx: -1 });
  }

  const filteredParentOptions = availablePages.filter(opt =>
    opt.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !currentSelections.some(s => s.parent.split('=')[0] === opt.title)
  )

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  const handleSaveAll = async () => {
    if (!selectedUserId) return
    setSaving(true)
    setMessage(null)
    try {
      // 1. Save Pages
      const resPages = await fetch(`/api/admin/users/${selectedUserId}/pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: pagesText })
      })
      const dataPages = await resPages.json()

      // 2. Save Roles
      const resRoles = await fetch(`/api/admin/users/${selectedUserId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRoles.join(',') })
      })
      const dataRoles = await resRoles.json()

      if (dataPages.ok && dataRoles.ok) {
        setMessage({ type: 'success', text: 'Konfigurasi akses & role berhasil diperbarui!' })
        // Update local state with fresh data from backend (usually identical but safer)
        setSelectedUser(prev => prev ? {
          ...prev,
          pages: pagesText,
          roles: selectedRoles,
          pagesTree: dataPages.data.pagesTree
        } : null)
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Gagal memperbarui salah satu konfigurasi' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' })
    } finally {
      setSaving(false)
    }
  }

  // Helper untuk meratakan semua halaman sistem yang mungkin dipilih sebagai sub
  const getAllSystemPageSuggestions = (parentTitle: string, currentSubs: string[], originalParent: PageOption | undefined) => {
    const allFlattened: { title: string, page?: string, isBawaan?: boolean }[] = [];

    availablePages.forEach(p => {
      const isOriginalChild = originalParent?.children?.some(c => c.title === p.title);
      allFlattened.push({ title: p.title, page: p.page, isBawaan: isOriginalChild });
      if (p.children) {
        p.children.forEach(c => {
          const isOriginalSubChild = originalParent?.children?.some(oc => oc.title === c.title);
          allFlattened.push({ title: c.title, page: c.page, isBawaan: isOriginalSubChild });
        });
      }
    });

    const unique = allFlattened.reduce((acc, curr) => {
      const exists = acc.find(item => item.title === curr.title);
      const alreadyInParent = currentSubs.some(ex => ex.split('=')[0] === curr.title);
      const isSelf = parentTitle === curr.title;
      if (curr.title.toLowerCase().includes(subSearchQuery.toLowerCase()) && !exists && !alreadyInParent && !isSelf) {
        acc.push(curr);
      }
      return acc;
    }, [] as typeof allFlattened);

    return unique;
  }

  return (
    <div className="container">
      <div className="glassHeader">
        <div className="titleSection">
          <div className="iconBox"><i className="fa-solid fa-user-shield"></i></div>
          <div>
            <h2>Manajer Izin & Akses Halaman</h2>
            <p>Atur peran fungsional (Role) sekaligus struktur navigasi personil dalam satu panel terpadu.</p>
          </div>
        </div>
      </div>

      <div className="mainGrid">
        <div className="sidePanel">
          <div className="card">
            <label className="inputLabel">Pilih Personil</label>
            <select
              className="styledSelect"
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={loading}
            >
              <option value="">Cari dan Pilih Personil...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.nama} (@{u.username})</option>
              ))}
            </select>

            {selectedUser && (
              <div className="userBadge">
                <span className="uName">{selectedUser.nama}</span>
                <span className="uMeta">@{selectedUser.username} • {selectedUser.divisi || 'N/A'}</span>
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="card roleCard">
              <label className="inputLabel">Penugasan Role</label>
              <div className="rolesGrid">
                {availableRoles.map((role) => (
                  <label key={role} className={`roleItem ${selectedRoles.includes(role) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      hidden
                      checked={selectedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    <i className={`fa-solid ${selectedRoles.includes(role) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                    <span>{formatRoleDisplay(role)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="card previewCard">
              <label className="inputLabel">Live Preview Navigation</label>
              <div className="liveSidebar">
                {selectedUser.pagesTree && selectedUser.pagesTree.length > 0 ? (
                  selectedUser.pagesTree.map((node, i) => (
                    <div key={i} className="liveNode">
                      <div className="pNode"><i className="fa-solid fa-folder"></i> {node.title}</div>
                      {node.children && node.children.map((child, j) => (
                        <div key={j} className="cNode"><i className="fa-solid fa-minus"></i> {child.title}</div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="emptyStatus">Struktur Menu Belum Diatur</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="configPanel">
          {selectedUser ? (
            <>
              <div className="searchStack" ref={parentSearchRef}>
                <div className="mainSearchBar">
                  <i className="fa-solid fa-search"></i>
                  <input
                    type="text"
                    placeholder="Pilih modul sistem atau ketik submenu kustom baru..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setShowParentDropdown(true)
                    }}
                    onFocus={() => setShowParentDropdown(true)}
                  />
                  {showParentDropdown && (
                    <div className="searchPortalParent">
                      <div className="portalLabel">Modul Sistem Tersedia</div>
                      {filteredParentOptions.length > 0 ? (
                        filteredParentOptions.map((opt, i) => (
                          <div key={i} className="portalItem" onClick={() => addParentPage(opt)}>
                            <i className="fa-solid fa-cube"></i>
                            <div className="portalItemInfo">
                              <span className="pLabel">{opt.title}</span>
                              <span className="pRoute">{opt.children ? 'FOLDER' : `/${(opt.page || opt.title)}`}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="portalNoData">Tidak ditemukan modul yang cocok</div>
                      )}
                      {searchQuery.trim() && (
                        <div className="portalAction" onClick={() => {
                          setCustomPage({ title: searchQuery, page: '', isSub: false, parentTarget: '', parentIdx: -1 });
                          setShowCustomModal(true);
                          setShowParentDropdown(false);
                        }}>
                          <i className="fa-solid fa-plus-circle"></i>
                          <span>Buat Menu Kustom: <strong>"{searchQuery}"</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="canvasGrid">
                {currentSelections.length === 0 ? (
                  <div className="canvasEmpty">
                    <div className="eIcon"><i className="fa-solid fa-layer-group"></i></div>
                    <h3>Kanvas Arsitektur Menu</h3>
                    <p>Mulai tambahkan halaman kustom atau pilih dari modul sistem di atas untuk menyusun izin akses user ini.</p>
                  </div>
                ) : (
                  <div className="nodeList">
                    {currentSelections.map((sel, idx) => {
                      const originalParent = availablePages.find(p => p.title === sel.parent.split('=')[0])
                      return (
                        <div key={idx} className="nodeCard">
                          <div className="nodeActions">
                            <button className="move" onClick={() => moveParent(idx, 'up')} disabled={idx === 0}><i className="fa-solid fa-chevron-up"></i></button>
                            <button className="move" onClick={() => moveParent(idx, 'down')} disabled={idx === currentSelections.length - 1}><i className="fa-solid fa-chevron-down"></i></button>
                          </div>
                          <div className="nodeBody">
                            <div className="nodeHeader">
                              <div className="nodeMeta">
                                <span className="nodeLabel">{sel.parent.split('=')[0]}</span>
                                {sel.parent.includes('=') && <span className="nodeRoute">/{sel.parent.split('=')[1]}</span>}
                              </div>
                              <button className="nodeDel" onClick={() => removeParent(idx)}><i className="fa-solid fa-trash-alt"></i></button>
                            </div>
                            <div className="subNodeArea">
                              <div className="subListItems">
                                {sel.children.map((child, cIdx) => (
                                  <div key={cIdx} className="subItemTag">
                                    <div className="subSort">
                                      <i className="fa-solid fa-caret-left" onClick={() => moveSub(idx, cIdx, 'up')}></i>
                                      <span>{child.split('=')[0]}</span>
                                      <i className="fa-solid fa-caret-right" onClick={() => moveSub(idx, cIdx, 'down')}></i>
                                    </div>
                                    <i className="fa-solid fa-times subDel" onClick={() => removeChild(idx, cIdx)}></i>
                                  </div>
                                ))}
                                <div className="subAddContainer">
                                  <button className="subTrigger" onClick={() => {
                                    setActiveSubSearchId(sel.parent)
                                    setSubSearchQuery('')
                                  }}>
                                    <i className="fa-solid fa-plus"></i> Sub
                                  </button>
                                  {activeSubSearchId === sel.parent && (
                                    <div className="subSearchPortal">
                                      <div className="subSearchBox"><input autoFocus value={subSearchQuery} onChange={e => setSubSearchQuery(e.target.value)} onBlur={() => setTimeout(() => setActiveSubSearchId(null), 200)} placeholder="Cari fitur..." /></div>
                                      <div className="subOptions">
                                        {getAllSystemPageSuggestions(sel.parent.split('=')[0], sel.children, originalParent).map((item, k) => (
                                          <div key={k} className="subOpt" onClick={() => addChildPage(idx, item.page && item.page !== item.title ? `${item.title}=${item.page}` : item.title)}>
                                            <i className={`fa-solid ${item.isBawaan ? 'fa-star' : 'fa-link'}`}></i>
                                            <span>{item.title}</span>
                                            {item.isBawaan && <small>(Ori)</small>}
                                          </div>
                                        ))}
                                        {subSearchQuery.trim() && (
                                          <div className="subOpt kustom" onClick={() => {
                                            setCustomPage({ title: subSearchQuery, page: '', isSub: true, parentTarget: sel.parent.split('=')[0], parentIdx: idx });
                                            setShowCustomModal(true);
                                            setActiveSubSearchId(null);
                                          }}>
                                            <i className="fa-solid fa-plus gold"></i> Kustom: "{subSearchQuery}"
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="configFooter">
                {message && (
                  <div className={`statusMsg ${message.type}`}>
                    <i className={`fa-solid ${message.type === 'success' ? 'fa-check-circle' : 'bi-exclamation-triangle'}`}></i>
                    {message.text}
                  </div>
                )}
                <button className="saveAction" onClick={handleSaveAll} disabled={saving}>
                  {saving ? <i className="fa-solid fa-spin fa-spinner"></i> : <i className="fa-solid fa-save"></i>}
                  {saving ? 'Menyimpan Semua Data...' : 'Simpan Izin & Arsitektur'}
                </button>
              </div>
            </>
          ) : (
            <div className="nodeWelcome">
              <div className="wIcon"><i className="fa-solid fa-shield-alt"></i></div>
              <h3>Pusat Kontrol Izin</h3>
              <p>Pilih salah satu personil dari list kiri untuk mulai mengatur hak akses dan peran mereka dalam satu kali simpan.</p>
            </div>
          )}
        </div>
      </div>

      {showCustomModal && (
        <div className="modalBase">
          <div className="modalCard">
            <div className="modalHead">
              <h3><i className="fa-solid fa-code"></i> Menu Kustom</h3>
              <p>{customPage.isSub ? `Sebagai Sub dari: ${customPage.parentTarget}` : 'Sebagai Menu Utama'}</p>
            </div>
            <div className="modalForm">
              <div className="inputGroup"><label>Nama Tampilan</label><input value={customPage.title} onChange={e => setCustomPage({ ...customPage, title: e.target.value })} /></div>
              <div className="inputGroup"><label>Rute Teknis (ID)</label><input placeholder="Contoh: jurnal/admin" value={customPage.page} onChange={e => setCustomPage({ ...customPage, page: e.target.value })} /><small>Rute ini digunakan sistem untuk navigasi internal.</small></div>
            </div>
            <div className="modalBottom"><button className="cancel" onClick={() => setShowCustomModal(false)}>Batal</button><button className="confirm" onClick={handleAddCustom} disabled={!customPage.title}>Terapkan</button></div>
          </div>
        </div>
      )}

      <style jsx>{`
                .container { display: flex; flex-direction: column; gap: 20px; font-family: 'Outfit', sans-serif; }
                .glassHeader {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    padding: 30px; border-radius: 20px; color: white;
                    box-shadow: 0 10px 40px -15px rgba(15, 23, 42, 0.4);
                }
                .iconBox { width: 48px; height: 48px; background: #6366f1; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
                .titleSection { display: flex; align-items: center; gap: 20px; }
                .titleSection h2 { margin:0; font-size: 1.5rem; font-weight: 800; }
                .titleSection p { margin: 4px 0 0; opacity: 0.7; font-size: 0.95rem; }

                .mainGrid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
                .card { background: white; border-radius: 18px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .inputLabel { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 12px; }
                .styledSelect { width: 100%; padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9; background: #fff; font-weight: 700; outline: none; color: #1e293b; }
                .userBadge { margin-top: 15px; background: #f8fafc; padding: 12px; border-radius: 12px; border-left: 4px solid #6366f1; }
                .uName { display: block; font-weight: 800; color: #1e293b; font-size: 0.95rem; }
                .uMeta { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }

                .rolesGrid { display: flex; flex-direction: column; gap: 8px; }
                .roleItem { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; cursor: pointer; transition: 0.2s; font-size: 0.85rem; font-weight: 700; color: #475569; }
                .roleItem:hover { background: #f1f5f9; border-color: #cbd5e1; }
                .roleItem.selected { background: #eff6ff; border-color: #3b82f6; color: #2563eb; }
                .roleItem i { font-size: 1rem; opacity: 0.3; }
                .roleItem.selected i { opacity: 1; }

                .liveNode { margin-bottom: 15px; }
                .pNode { font-weight: 800; color: #1e293b; font-size: 0.8rem; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
                .pNode i { color: #6366f1; width: 20px; text-align: center; }
                .cNode { padding-left: 20px; font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
                .cNode i { font-size: 0.6rem; opacity: 0.5; }

                .mainSearchBar { position: relative; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 0 18px; display: flex; align-items: center; gap: 12px; transition: 0.2s; }
                .mainSearchBar:focus-within { border-color: #6366f1; background: white; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
                .mainSearchBar input { flex: 1; padding: 15px 0; border: none; outline: none; font-weight: 700; font-size: 1rem; color: #1e293b; background: transparent; }
                .searchPortalParent { position: absolute; top: 100%; left: 0; right: 0; background: white; border-radius: 16px; margin-top: 8px; box-shadow: 0 20px 50px -10px rgba(0,0,0,0.2); z-index: 1000; border: 1px solid #e2e8f0; overflow: hidden; }
                .portalLabel { padding: 10px 15px; background: #f8fafc; font-size: 0.65rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
                .portalItem { padding: 12px 15px; cursor: pointer; display: flex; align-items: center; gap: 12px; }
                .portalItem:hover { background: #f5f7ff; }
                .portalItem i { width: 30px; height: 30px; background: #eef2f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6366f1; }
                .pLabel { font-weight: 800; color: #1e293b; }
                .pRoute { margin-left: auto; font-size: 0.6rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 800; color: #64748b; }
                .portalAction { background: #eff6ff; padding: 15px; color: #2563eb; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; border-top: 1px solid #e2e8f0; }

                .nodeCard { display: flex; gap: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 18px; padding: 15px; transition: 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
                .nodeActions { width: 32px; display: flex; flex-direction: column; gap: 4px; border-right: 1px solid #f1f5f9; padding-right: 12px; justify-content: center; }
                .nodeActions button { border: none; background: #f8fafc; border-radius: 6px; height: 26px; cursor: pointer; color: #94a3b8; }
                .nodeActions button:hover:not(:disabled) { color: #6366f1; background: #eff6ff; }
                .nodeBody { flex: 1; }
                .nodeHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .nodeLabel { font-weight: 900; font-size: 1.05rem; color: #1e293b; }
                .nodeDel { background: transparent; border: none; color: #cbd5e1; cursor: pointer; transition: 0.2s; }
                .nodeDel:hover { color: #ef4444; }

                .subListItems { display: flex; flex-wrap: wrap; gap: 8px; }
                .subItemTag { background: #f1f5f9; padding: 6px 12px; border-radius: 10px; display: flex; align-items: center; gap: 10px; font-size: 0.8rem; font-weight: 700; color: #475569; }
                .subSort i { cursor: pointer; opacity: 0.3; padding: 0 2px; }
                .subSort i:hover { opacity: 1; color: #6366f1; }
                .subDel { color: #cbd5e1; cursor: pointer; }
                .subDel:hover { color: #ef4444; }

                .subTrigger { background: white; border: 2px dashed #e2e8f0; padding: 6px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: 800; color: #94a3b8; cursor: pointer; }
                .subTrigger:hover { border-color: #6366f1; color: #6366f1; }
                .subSearchPortal { position: absolute; bottom: 100%; left: 0; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); width: 240px; padding: 10px; border: 1px solid #e2e8f0; }
                .subSearchBox input { width: 100%; padding: 8px; border: 1px solid #f1f5f9; background: #f8fafc; border-radius: 8px; font-size: 0.8rem; outline: none; margin-bottom: 8px; }
                .subOptions { max-height: 180px; overflow-y: auto; }
                .subOpt { padding: 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
                .subOpt:hover { background: #f5f7ff; color: #6366f1; }
                .subOpt i { font-size: 0.7rem; opacity: 0.5; }
                .subOpt small { margin-left: auto; font-size: 0.6rem; background: #eef2f6; padding: 2px 4px; border-radius: 4px; }

                .configFooter { margin-top: 30px; padding: 25px; border-top: 2px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
                .saveAction { background: #2563eb; color: white; border: none; padding: 14px 40px; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 12px; box-shadow: 0 8px 20px -5px rgba(37, 99, 235, 0.4); transition: 0.2s; }
                .saveAction:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 25px -5px rgba(37, 99, 235, 0.5); }
                .statusMsg { font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; }
                .statusMsg.success { color: #16a34a; }
                .statusMsg.error { color: #dc2626; }

                .nodeWelcome { padding: 100px 40px; text-align: center; color: #94a3b8; }
                .wIcon { font-size: 4rem; color: #f1f5f9; margin-bottom: 20px; }

                .modalBase { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
                .modalCard { background: white; width: 400px; padding: 30px; border-radius: 20px; box-shadow: 0 30px 60px -10px rgba(0,0,0,0.5); }
                .modalHead h3 { margin:0; font-weight: 900; display: flex; align-items: center; gap: 10px; color: #1e293b; }
                .modalHead p { font-size: 0.8rem; color: #94a3b8; margin: 4px 0 20px; }
                .inputGroup { display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px; }
                .inputGroup label { font-size: 0.65rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
                .inputGroup input { padding: 12px; border: 2px solid #f1f5f9; border-radius: 10px; font-weight: 700; outline: none; }
                .inputGroup input:focus { border-color: #6366f1; }
                .modalBottom { display: flex; gap: 10px; margin-top: 20px; }
                .cancel { flex: 1; padding: 12px; border: none; background: #f1f5f9; color: #64748b; font-weight: 800; border-radius: 10px; cursor: pointer; }
                .confirm { flex: 2; padding: 12px; border: none; background: #6366f1; color: white; font-weight: 800; border-radius: 10px; cursor: pointer; }
            `}</style>
    </div>
  )
}
