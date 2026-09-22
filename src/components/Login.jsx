import React, { useState } from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) { setErr('Completá usuario y contraseña.'); return }
    setLoading(true)
    setErr('')
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, username, rol')
      .eq('username', username.trim().toLowerCase())
      .eq('password', password)
      .maybeSingle()
    setLoading(false)
    if (error) { setErr('Error: ' + error.message); return }
    if (!data) { setErr('Usuario o contraseña incorrectos.'); return }
    onLogin(data)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--wh)', borderRadius: 18, padding: '40px 36px', width: '100%', maxWidth: 380,
        boxShadow: 'var(--sh2)', border: '1px solid var(--bd)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.jpg" alt="Kangaroo Fun" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--or2)', marginBottom: 14 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--nv)', fontFamily: "'Nunito', sans-serif" }}>Kangaroo Fun</div>
          <div style={{ fontSize: 13, color: 'var(--mu)', marginTop: 2 }}>Sistema de gestión</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fgg">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setErr('') }}
              placeholder="Ej: kangaroo1"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="fgg">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErr('') }}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>

          {err && (
            <div style={{ fontSize: 13, color: 'var(--rd, #ef4444)', fontWeight: 600, textAlign: 'center', background: 'rgba(239,68,68,.08)', borderRadius: 8, padding: '8px 12px' }}>
              {err}
            </div>
          )}

          <button
            type="submit"
            className="bp"
            disabled={loading}
            style={{ width: '100%', padding: '13px', fontSize: 15, marginTop: 4 }}
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
