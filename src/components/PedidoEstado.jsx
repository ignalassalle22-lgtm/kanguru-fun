import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'

const C = {
  or: '#E8621A', or2: '#F5874A',
  nv: '#1B3A6B', nv2: '#2B5299',
  bg: '#F5F3EF', wh: '#FFFFFF',
  tx: '#1B3A6B', mu: '#6B7A99',
  gn: '#1A7A45', gnb: '#E8F5EE',
  am: '#A86200', amb: '#FFF3D4',
}

const fmt = n => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

const PASOS = [
  { id: 'pendiente',      label: 'Recibido',        icon: '📋' },
  { id: 'en_preparacion', label: 'En preparación',  icon: '👨‍🍳' },
  { id: 'listo',          label: '¡Listo!',         icon: '✅' },
]

function pasoIndex(estado) {
  const i = PASOS.findIndex(p => p.id === estado)
  return i === -1 ? 0 : i
}

// AudioContext compartido — se desbloquea en el primer toque (necesario en iOS)
let _audioCtx = null
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (_audioCtx.state === 'suspended') _audioCtx.resume()
  return _audioCtx
}

function playNotifSound() {
  try {
    const ctx = getAudioCtx()
    const notas = [880, 1100, 1320]
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.4, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      osc.start(t); osc.stop(t + 0.35)
    })
  } catch (_) {}
}

export default function PedidoEstado() {
  const [pedido, setPedido] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [flash, setFlash] = useState(false)
  const estadoRef = useRef(null)
  const wakeLockRef = useRef(null)

  const pedidoId = new URLSearchParams(window.location.search).get('id')

  // Desbloquear AudioContext en el primer toque (iOS requiere gesto del usuario)
  useEffect(() => {
    const unlock = () => { try { getAudioCtx() } catch (_) {} }
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('click', unlock, { once: true })
    return () => {
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('click', unlock)
    }
  }, [])

  // Wake Lock
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator)
          wakeLockRef.current = await navigator.wakeLock.request('screen')
      } catch (_) {}
    }
    requestWakeLock()
    const handleVisibility = () => { if (document.visibilityState === 'visible') requestWakeLock() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  function handleNuevoEstado(nuevoEstado) {
    if (nuevoEstado === estadoRef.current) return
    estadoRef.current = nuevoEstado
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
    if (nuevoEstado === 'listo') {
      playNotifSound()
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400])
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('¡Tu pedido está listo! 🎉', { body: 'Pasá a retirar en caja · Kangaroo Fun', icon: '/logo.jpg' })
      }
    }
    if (nuevoEstado === 'cobrado') {
      localStorage.removeItem('kf_pedido_id')
      localStorage.removeItem('kf_pedido_num')
    }
  }

  useEffect(() => {
    if (!pedidoId) { setError('No se encontró el pedido.'); setLoading(false); return }

    // Carga inicial
    supabase.from('pedidos').select('*, pedido_items(*)').eq('id', pedidoId).single()
      .then(({ data, error }) => {
        if (error || !data) { setError('Pedido no encontrado.'); setLoading(false); return }
        estadoRef.current = data.estado
        setPedido(data)
        setLoading(false)
      })

    // Realtime (funciona si la tabla está en la publicación supabase_realtime)
    const channel = supabase
      .channel(`pedido-estado-${pedidoId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos',
        filter: `id=eq.${pedidoId}`,
      }, (payload) => {
        setPedido(prev => ({ ...prev, ...payload.new }))
        handleNuevoEstado(payload.new.estado)
      })
      .subscribe()

    // Polling cada 15 seg como respaldo (captura cambios si Realtime no funciona)
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('pedidos').select('estado').eq('id', pedidoId).single()
      if (data && data.estado !== estadoRef.current) {
        // Realtime no entregó el cambio — lo buscamos completo
        const { data: full } = await supabase
          .from('pedidos').select('*, pedido_items(*)').eq('id', pedidoId).single()
        if (full) {
          setPedido(full)
          handleNuevoEstado(full.estado)
        }
      }
    }, 15000)

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [pedidoId])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.jpg" alt="Kangaroo Fun" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }} />
        <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: C.mu }}>Cargando pedido...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center', padding: '0 32px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
        <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 600, color: C.mu }}>{error}</p>
        <a href="/menu" style={{ color: C.or, fontWeight: 700, fontSize: 14, marginTop: 12, display: 'block' }}>← Volver al menú</a>
      </div>
    </div>
  )

  const pasoActual = pasoIndex(pedido.estado)
  const esListo = pedido.estado === 'listo'
  const esCobrado = pedido.estado === 'cobrado'
  const esCancelado = pedido.estado === 'cancelado'

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>

      {/* Header */}
      <div style={{
        background: esListo
          ? `linear-gradient(135deg, ${C.gn} 0%, #16a34a 100%)`
          : `linear-gradient(135deg, ${C.nv} 0%, ${C.nv2} 60%, ${C.or} 100%)`,
        padding: '28px 24px 48px',
        textAlign: 'center',
        transition: 'background 0.8s ease',
      }}>
        <img src="/logo.jpg" alt="Kangaroo Fun" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', display: 'block', margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }} />
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'Nunito, sans-serif', marginBottom: 4 }}>Kangaroo Fun</div>
        <h1 style={{ color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 22, margin: '0 0 4px' }}>
          Pedido #{pedido.numero}
        </h1>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 600 }}>{pedido.nombre}</div>
      </div>

      <div style={{ height: 24, background: esListo ? '#16a34a' : C.nv2, borderRadius: '0 0 28px 28px', marginTop: -1 }} />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 16px 64px' }}>

        {/* Estado cancelado */}
        {esCancelado && (
          <div style={{ background: '#FDEAEA', border: '1px solid rgba(163,32,32,.2)', borderRadius: 16, padding: '24px 20px', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>❌</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 20, color: '#A32020', marginBottom: 6 }}>Pedido cancelado</div>
            <div style={{ fontSize: 14, color: '#A32020', opacity: 0.8 }}>Consultá en caja si tenés dudas.</div>
            <a href="/menu" style={{ display: 'inline-block', marginTop: 16, background: C.or, color: '#fff', borderRadius: 10, padding: '10px 24px', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>Volver al menú</a>
          </div>
        )}

        {/* Aviso: mantener página abierta */}
        {!esListo && !esCobrado && !esCancelado && (
          <div style={{ background: C.amb, border: `1px solid rgba(168,98,0,0.2)`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📱</span>
            <div style={{ fontSize: 13, color: C.am, fontWeight: 600, lineHeight: 1.4 }}>
              Dejá esta pantalla abierta para recibir el sonido cuando tu pedido esté listo.
            </div>
          </div>
        )}

        {/* Estado listo — celebración */}
        {esListo && (
          <div style={{
            background: C.gnb, border: '2px solid rgba(34,197,94,.4)', borderRadius: 16,
            padding: '24px 20px', textAlign: 'center', marginBottom: 24,
          }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 22, color: C.gn, marginBottom: 6 }}>
              ¡Tu pedido está listo!
            </div>
            <div style={{ fontSize: 15, color: C.gn, fontWeight: 600 }}>
              Pasá a retirar en caja
            </div>
          </div>
        )}

        {/* Estado cobrado */}
        {esCobrado && (
          <div style={{ background: C.wh, borderRadius: 16, padding: '20px', textAlign: 'center', marginBottom: 24, boxShadow: '0 2px 10px rgba(27,58,107,0.08)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 18, color: C.tx }}>¡Gracias!</div>
            <div style={{ color: C.mu, fontSize: 14, marginTop: 4 }}>Tu pedido fue entregado.</div>
          </div>
        )}

        {/* Barra de progreso */}
        {!esCobrado && !esCancelado && (
          <div style={{ background: C.wh, borderRadius: 16, padding: '20px', marginBottom: 20, boxShadow: '0 2px 10px rgba(27,58,107,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, left: '16%', right: '16%', height: 3, background: 'var(--bd)', borderRadius: 2, zIndex: 0 }} />
              <div style={{ position: 'absolute', top: 16, left: '16%', height: 3, width: `${pasoActual * 34}%`, background: esListo ? C.gn : C.or, borderRadius: 2, zIndex: 1, transition: 'width 0.6s ease' }} />

              {PASOS.map((paso, i) => {
                const activo = i <= pasoActual
                const actual = i === pasoActual
                return (
                  <div key={paso.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 2 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: activo ? (esListo && actual ? C.gn : C.or) : 'var(--bg)',
                      border: `3px solid ${activo ? (esListo && actual ? C.gn : C.or) : 'var(--bd2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, transition: 'all 0.4s ease',
                      boxShadow: actual ? `0 0 0 4px ${esListo ? 'rgba(34,197,94,.2)' : 'rgba(232,98,26,.2)'}` : 'none',
                    }}>
                      {activo ? paso.icon : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mu2)', display: 'block' }} />}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: actual ? 800 : 500, color: activo ? C.tx : C.mu, textAlign: 'center', lineHeight: 1.3 }}>
                      {paso.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Detalle del pedido */}
        <div style={{ background: C.wh, borderRadius: 16, padding: '16px', boxShadow: '0 2px 10px rgba(27,58,107,0.07)', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14, color: C.tx, marginBottom: 12 }}>
            Tu pedido
          </div>
          {(pedido.pedido_items || []).map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--bd)', color: C.tx }}>
              <span style={{ fontWeight: 600 }}>{it.nombre_producto} <span style={{ color: C.mu }}>×{it.cantidad}</span></span>
              <span style={{ fontWeight: 700 }}>{fmt(it.subtotal)}</span>
            </div>
          ))}
          {pedido.notas && (
            <div style={{ fontSize: 12, color: C.am, background: C.amb, borderRadius: 7, padding: '6px 10px', marginTop: 10 }}>📝 {pedido.notas}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, color: C.nv }}>
            Total: {fmt(pedido.total)}
          </div>
        </div>

        <a href="/menu" style={{ display: 'block', textAlign: 'center', color: C.or, fontWeight: 700, fontSize: 14 }}>
          ← Volver al menú
        </a>
      </div>
    </div>
  )
}
