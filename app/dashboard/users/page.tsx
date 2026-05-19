'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/shared/ToastContext'

interface AppUser {
  id: string
  username: string
  role: string
  store: string
  created_at: string
}

type ModalMode = 'add' | 'edit' | null

const ROLES = ['Admin', 'Manager', 'Sales Supervisor', 'Sales', 'Order']
const STORES = ['', 'VN', 'US', 'ADM']

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 'var(--text-xs)', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 500,
  padding: '10px 12px', borderBottom: '1px solid var(--border-base)',
  background: 'var(--bg-base)', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid var(--border-light)',
  fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
}
const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid var(--border-base)',
  background: 'transparent', padding: '6px 0',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
}
const selectStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border-base)', borderRadius: 0,
  background: 'var(--bg-surface)', padding: '6px 8px',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--text-xs)', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 4,
}

export default function UsersPage() {
  const { toast, update } = useToast()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalMode>(null)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null)

  // Form fields
  const [fUsername, setFUsername] = useState('')
  const [fPassword, setFPassword] = useState('')
  const [fRole, setFRole] = useState('Sales')
  const [fStore, setFStore] = useState('')
  const [fNewPassword, setFNewPassword] = useState('')

  async function load() {
    setLoading(true); setError('')
    const tid = toast('Loading users...', 'loading')
    try {
      const r = await fetch('/api/users')
      if (!r.ok) { setError('Access denied'); update(tid, 'Access denied', 'danger'); return }
      const d = await r.json()
      setUsers(d.data || [])
      update(tid, 'Users loaded', 'success')
    } catch { setError('Failed to load users'); update(tid, 'Failed to load users', 'danger') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setFUsername(''); setFPassword(''); setFRole('Sales'); setFStore(''); setFNewPassword('')
    setFormError(''); setModal('add')
  }

  function openEdit(u: AppUser) {
    setEditUser(u)
    setFRole(u.role); setFStore(u.store); setFNewPassword('')
    setFormError(''); setModal('edit')
  }

  function closeModal() { setModal(null); setEditUser(null) }

  async function handleSave() {
    setFormError('')
    if (modal === 'add') {
      if (!fUsername.trim() || !fPassword.trim()) { setFormError('Username và password là bắt buộc'); return }
      setSaving(true)
      const tid = toast(`Creating user "${fUsername}"...`, 'loading')
      try {
        const r = await fetch('/api/users', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: fUsername, password: fPassword, role: fRole, store: fStore }),
        })
        const d = await r.json()
        if (!r.ok) { setFormError(d.error || 'Failed'); update(tid, d.error || 'Create failed', 'danger'); return }
        closeModal(); update(tid, `User "${fUsername}" created`, 'success'); load()
      } catch (e: any) { update(tid, e.message, 'danger') }
      finally { setSaving(false) }
    } else if (modal === 'edit' && editUser) {
      setSaving(true)
      const tid = toast(`Updating user "${editUser.username}"...`, 'loading')
      try {
        const body: any = { id: editUser.id, role: fRole, store: fStore }
        if (fNewPassword.trim()) body.newPassword = fNewPassword.trim()
        const r = await fetch('/api/users', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const d = await r.json()
        if (!r.ok) { setFormError(d.error || 'Failed'); update(tid, d.error || 'Update failed', 'danger'); return }
        closeModal(); update(tid, `User "${editUser.username}" updated`, 'success'); load()
      } catch (e: any) { update(tid, e.message, 'danger') }
      finally { setSaving(false) }
    }
  }

  function handleDelete(u: AppUser) { setDeleteUser(u) }

  async function doDelete() {
    if (!deleteUser) return
    const u = deleteUser
    setDeleteUser(null)
    const tid = toast(`Deleting "${u.username}"...`, 'loading')
    try {
      const r = await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { update(tid, d.error || 'Failed to delete', 'danger'); return }
      update(tid, `User "${u.username}" deleted`, 'success'); load()
    } catch { update(tid, 'Failed to delete', 'danger') }
  }

  function roleBadgeStyle(role: string): React.CSSProperties {
    const map: Record<string, { bg: string; color: string }> = {
      'Admin':            { bg: '#1A1814', color: '#FAFAF7' },
      'Manager':          { bg: '#1A1814', color: '#FAFAF7' },
      'Sales Supervisor': { bg: '#4A6B8C', color: '#FAFAF7' },
      'Sales':            { bg: '#4A6B8C', color: '#FAFAF7' },
      'Order':            { bg: '#6B5A4A', color: '#FAFAF7' },
    }
    const c = map[role] || { bg: 'var(--bg-muted)', color: 'var(--text-primary)' }
    return {
      background: c.bg, color: c.color,
      padding: '2px 10px', fontSize: 'var(--text-xs)',
      fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', display: 'inline-block',
    }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: '0 0 4px' }}>
            ADMIN
          </p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
            User Management
          </h2>
        </div>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 16px', border: '1px solid var(--color-danger)',
          borderRadius: 0, background: 'transparent',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
          fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--color-danger)', cursor: 'pointer',
        }}>
          <i className="fa-solid fa-user-plus" style={{ fontSize: 11 }} />
          ADD NEW USER
        </button>
      </div>


      {error && (
        <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '10px 14px', marginBottom: '1rem', background: '#FAF2F2', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />{error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['ID', 'USERNAME', 'ROLE', 'STORE', 'CREATED', 'ACTIONS'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  No users found
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {u.id ? u.id.substring(0, 8) + '...' : '—'}
                </td>
                <td style={td}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</span>
                </td>
                <td style={td}>
                  <span style={roleBadgeStyle(u.role)}>{u.role}</span>
                </td>
                <td style={td}>
                  {u.store
                    ? <span style={{ border: '1px solid var(--border-base)', padding: '1px 8px', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>{u.store}</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>
                  }
                </td>
                <td style={{ ...td, color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(u)} style={{
                      background: 'none', border: '1px solid #B8860B',
                      borderRadius: 0, padding: '4px 10px', cursor: 'pointer',
                      fontSize: 'var(--text-xs)', color: '#B8860B',
                    }}>
                      <i className="fa-solid fa-pen-to-square" style={{ fontSize: 11 }} />
                    </button>
                    <button onClick={() => handleDelete(u)} style={{
                      background: 'none', border: '1px solid var(--color-danger)',
                      borderRadius: 0, padding: '4px 10px', cursor: 'pointer',
                      fontSize: 'var(--text-xs)', color: 'var(--color-danger)',
                    }}>
                      <i className="fa-solid fa-trash-can" style={{ fontSize: 11 }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── DELETE CONFIRM ── */}
      {deleteUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: 400, padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: '0 0 0.75rem' }}>Xác nhận xóa</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>
              Xóa user <strong>{deleteUser.username}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteUser(null)} className="btn-outline" style={{ padding: '8px 18px' }}>Hủy</button>
              <button onClick={doDelete} style={{ padding: '8px 18px', background: 'var(--color-danger)', color: '#fff', border: '1px solid var(--color-danger)', borderRadius: 0, cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ─── */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4,
            padding: '1.5rem', width: 420, maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
                {modal === 'add' ? 'Add New User' : `Edit: ${editUser?.username}`}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {formError && (
              <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)', background: '#FAF2F2' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {modal === 'add' && (
                <>
                  <div>
                    <label style={labelStyle}>Username *</label>
                    <input
                      style={inputStyle}
                      value={fUsername}
                      onChange={e => setFUsername(e.target.value)}
                      placeholder="username"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password *</label>
                    <input
                      type="password"
                      style={inputStyle}
                      value={fPassword}
                      onChange={e => setFPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </>
              )}

              <div>
                <label style={labelStyle}>Role</label>
                <select style={selectStyle} value={fRole} onChange={e => setFRole(e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Store</label>
                <select style={selectStyle} value={fStore} onChange={e => setFStore(e.target.value)}>
                  <option value="">All Stores</option>
                  {STORES.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {modal === 'edit' && (
                <div>
                  <label style={labelStyle}>New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={fNewPassword}
                    onChange={e => setFNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <button onClick={closeModal} className="btn-outline" style={{ padding: '8px 20px' }}>Cancel</button>
              <button onClick={handleSave} className="btn-primary" style={{ padding: '8px 20px' }} disabled={saving}>
                {saving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />Saving...</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
