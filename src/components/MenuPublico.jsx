import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

const C = {
  or: '#E8621A', or2: '#F5874A',
  nv: '#1B3A6B', nv2: '#2B5299',
  bg: '#F7F4F0', wh: '#FFFFFF',
  tx: '#1B3A6B', mu: '#6B7A99', mu2: '#A8B3C8',
  gn: '#1A7A45',
}

const fmt = n => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

// Poner en true para rehabilitar pedidos desde la web
const PEDIDOS_HABILITADOS = false

export default function MenuPublico() {
  const [cfg, setCfg] = useState(null)
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pedido activo (localStorage)
  const [pedidoActivo, setPedidoActivo] = useState(() => {
    const id = localStorage.getItem('kf_pedido_id')
    const num = localStorage.getItem('kf_pedido_num')
    return id ? { id, num } : null
  })

  // Carrito
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [mesa, setMesa] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pedidoError, setPedidoError] = useState('')

  const cartCount = cart.reduce((s, it) => s + it.qty, 0)
  const cartTotal = cart.reduce((s, it) => s + it.precio_venta * it.qty, 0)

  const addToCart = (prod) => {
    setCart(prev => {
      const ex = prev.find(it => it.id === prod.id)
      if (ex) return prev.map(it => it.id === prod.id ? { ...it, qty: it.qty + 1 } : it)
      return [...prev, { id: prod.id, nombre: prod.nombre, precio_venta: prod.precio_venta || 0, qty: 1, categoria_id: prod.categoria_id }]
    })
  }
  const removeFromCart = (id) => setCart(prev => prev.filter(it => it.id !== id))
  const setQty = (id, qty) => {
    if (qty <= 0) { removeFromCart(id); return }
    setCart(prev => prev.map(it => it.id === id ? { ...it, qty } : it))
  }

  const handlePedido = async () => {
    if (!nombre.trim()) { setPedidoError('Ingresá tu nombre para continuar.'); return }
    if (cart.length === 0) { setPedidoError('Tu carrito está vacío.'); return }
    setPedidoError('')
    setEnviando(true)
    try {
      const total = cartTotal
      const { data: pedidoData, error: pe } = await supabase
        .from('pedidos')
        .insert({ nombre: nombre.trim(), mesa: mesa.trim() || null, notas: notas.trim() || null, total, estado: 'pendiente' })
        .select().single()
      if (pe) throw new Error(`pedidos: ${pe.message} (${pe.code})`)

      const items = cart.map(it => ({
        pedido_id: pedidoData.id,
        producto_id: it.id,
        nombre_producto: it.nombre,
        precio_unitario: it.precio_venta,
        cantidad: it.qty,
        subtotal: it.precio_venta * it.qty,
      }))
      const { error: ie } = await supabase.from('pedido_items').insert(items)
      if (ie) throw new Error(`pedido_items: ${ie.message} (${ie.code})`)

      localStorage.setItem('kf_pedido_id', pedidoData.id)
      localStorage.setItem('kf_pedido_num', pedidoData.numero)
      window.location.href = `/pedido?id=${pedidoData.id}`
    } catch (e) {
      setPedidoError(e.message || 'Error al enviar el pedido.')
      setEnviando(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [cfgRes, prodRes, catRes] = await Promise.all([
          supabase.from('configuracion').select('valor').eq('clave', 'menu_digital').maybeSingle(),
          supabase.from('productos').select('*').eq('activo', true).order('nombre'),
          supabase.from('categorias').select('*').order('nombre'),
        ])
        if (!cfgRes.data?.valor) { setError('Menú no disponible.'); setLoading(false); return }
        const c = cfgRes.data.valor
        if (!c.activo) { setError('El menú no está disponible en este momento.'); setLoading(false); return }
        setCfg(c)
        const ids = c.productosIds || []
        const prods = (prodRes.data || []).filter(p => ids.includes(p.id))
        const cats = catRes.data || []
        const mapa = {}
        for (const prod of prods) {
          const cat = cats.find(ct => ct.id === prod.categoria_id)
          const key = cat ? cat.nombre : 'Otros'
          if (!mapa[key]) mapa[key] = { nombre: key, items: [] }
          mapa[key].items.push(prod)
        }
        setGrupos(Object.values(mapa).sort((a, b) => {
          if (a.nombre === 'Otros') return 1
          if (b.nombre === 'Otros') return -1
          return a.nombre.localeCompare(b.nombre)
        }))
      } catch (e) { setError('Error al cargar el menú.') }
      setLoading(false)
    }
    load()
  }, [])

  const logoSrc = cfg?.logoUrl || '/logo.jpg'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.jpg" alt="Kangaroo Fun" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', marginBottom: 16, opacity: 0.8 }} />
        <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: C.mu, fontSize: 15 }}>Cargando...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ textAlign: 'center', padding: '0 32px' }}>
        <img src="/logo.jpg" alt="Kangaroo Fun" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', marginBottom: 16, opacity: 0.6 }} />
        <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 600, color: C.mu, fontSize: 15 }}>{error}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ position: 'relative', background: C.or, overflow: 'hidden', paddingBottom: 32 }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(27,58,107,0.15)', pointerEvents: 'none' }} />
        <div style={{ background: C.nv, height: 8, width: '100%' }} />
        <div style={{ textAlign: 'center', padding: '28px 24px 0' }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', background: C.wh, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 24px rgba(0,0,0,0.25)', border: `4px solid ${C.nv}`, overflow: 'hidden', margin: '0 auto 16px' }}>
            <img src={logoSrc} alt="Kangaroo Fun" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
          </div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 32, color: C.wh, letterSpacing: '-0.5px', margin: '0 0 6px', textShadow: '0 2px 8px rgba(0,0,0,0.2)', textTransform: 'uppercase' }}>
            Kangaroo <span style={{ color: C.nv, WebkitTextStroke: '1px rgba(255,255,255,0.3)' }}>Fun</span>
          </h1>
          <p style={{ fontFamily: 'Nunito Sans, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0, fontWeight: 600, letterSpacing: '.04em' }}>
            {cfg.subtitulo || 'Hacé tu pedido'}
          </p>
        </div>
        <svg viewBox="0 0 1440 48" style={{ display: 'block', marginTop: 28, width: '100%' }} preserveAspectRatio="none" height="48">
          <path d="M0,32 C360,0 1080,64 1440,32 L1440,48 L0,48 Z" fill={C.bg} />
        </svg>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '8px 16px 120px' }}>
        {grupos.length === 0 && (
          <div style={{ textAlign: 'center', color: C.mu, padding: '48px 0' }}>
            <p style={{ fontFamily: 'Nunito Sans, sans-serif', fontSize: 15 }}>No hay productos disponibles.</p>
          </div>
        )}
        {grupos.map(grupo => (
          <div key={grupo.nombre} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '28px 0 14px' }}>
              <div style={{ background: C.nv, color: C.wh, fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', padding: '5px 14px 5px 12px', borderRadius: '0 20px 20px 0', marginLeft: -16, boxShadow: '2px 2px 8px rgba(27,58,107,0.18)' }}>
                {grupo.nombre}
              </div>
              <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${C.nv} 0%, transparent 100%)`, marginLeft: 8, opacity: 0.15 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grupo.items.map((prod, pi) => {
                const enCarrito = cart.find(it => it.id === prod.id)
                return (
                  <div key={prod.id} style={{ background: C.wh, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 10px rgba(27,58,107,0.07)', borderLeft: `5px solid ${pi % 2 === 0 ? C.or : C.nv}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: C.tx, fontFamily: 'Nunito, sans-serif', lineHeight: 1.3 }}>{prod.nombre}</div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: C.nv, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap', marginRight: 8 }}>
                      {fmt(prod.precio_venta)}
                    </div>
                    {PEDIDOS_HABILITADOS && (enCarrito ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => setQty(prod.id, enCarrito.qty - 1)} style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${C.or}`, background: C.wh, color: C.or, fontWeight: 900, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
                        <span style={{ fontWeight: 800, fontSize: 15, color: C.tx, minWidth: 20, textAlign: 'center' }}>{enCarrito.qty}</span>
                        <button onClick={() => addToCart(prod)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: C.or, color: C.wh, fontWeight: 900, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(prod)} style={{ background: C.or, color: C.wh, border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Nunito, sans-serif', boxShadow: '0 2px 8px rgba(232,98,26,0.3)' }}>
                        + Agregar
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: C.nv, padding: '20px 16px', textAlign: 'center' }}>
        <img src="/logo.jpg" alt="Kangaroo Fun" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.or}`, display: 'block', margin: '0 auto 8px' }} />
        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, color: C.or2, fontSize: 14, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Kangaroo Fun</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Los precios pueden variar · Consultá en caja</div>
      </div>

      {/* Burbuja pedido activo */}
      {PEDIDOS_HABILITADOS && pedidoActivo && !cartOpen && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <a
            href={`/pedido?id=${pedidoActivo.id}`}
            style={{ background: C.nv, color: C.wh, borderRadius: 50, padding: '10px 18px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13, textDecoration: 'none', boxShadow: '0 4px 16px rgba(27,58,107,0.4)', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            <span style={{ fontSize: 16 }}>📋</span>
            {pedidoActivo.num ? `Pedido #${pedidoActivo.num}` : 'Ver mi pedido'}
          </a>
          <button
            onClick={() => { localStorage.removeItem('kf_pedido_id'); localStorage.removeItem('kf_pedido_num'); setPedidoActivo(null) }}
            style={{ background: 'rgba(27,58,107,0.15)', border: 'none', borderRadius: 50, padding: '4px 10px', fontSize: 11, color: C.mu, cursor: 'pointer', fontWeight: 700 }}
          >
            ✕ cerrar
          </button>
        </div>
      )}

      {/* Botón flotante del carrito */}
      {PEDIDOS_HABILITADOS && cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.or, color: C.wh, border: 'none', borderRadius: 50, padding: '14px 28px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 6px 24px rgba(232,98,26,0.5)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 50, whiteSpace: 'nowrap' }}>
          <span style={{ background: C.wh, color: C.or, borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>{cartCount}</span>
          Tu pedido · {fmt(cartTotal)}
        </button>
      )}

      {/* Panel del carrito */}
      {PEDIDOS_HABILITADOS && cartOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && setCartOpen(false)}>
          <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', background: C.wh, borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 20, color: C.tx }}>Tu pedido</div>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.mu, padding: '0 4px' }}>✕</button>
            </div>

            {/* Items del carrito */}
            <div style={{ marginBottom: 20 }}>
              {cart.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--bd)' }}>
                  <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: C.tx }}>{it.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setQty(it.id, it.qty - 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${C.or}`, background: C.wh, color: C.or, fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>−</button>
                    <span style={{ fontWeight: 800, fontSize: 14, minWidth: 18, textAlign: 'center' }}>{it.qty}</span>
                    <button onClick={() => setQty(it.id, it.qty + 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: C.or, color: C.wh, fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>+</button>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.nv, minWidth: 72, textAlign: 'right' }}>{fmt(it.precio_venta * it.qty)}</div>
                </div>
              ))}
            </div>

            {/* Formulario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>Tu nombre *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="¿Cómo te llamás?" style={{ width: '100%', border: '1.5px solid var(--bd2)', borderRadius: 10, padding: '10px 14px', fontSize: 15, fontFamily: 'Nunito, sans-serif', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>Mesa / número (opcional)</label>
                <input value={mesa} onChange={e => setMesa(e.target.value)} placeholder="Ej: Mesa 3, Salón Azul..." style={{ width: '100%', border: '1.5px solid var(--bd2)', borderRadius: 10, padding: '10px 14px', fontSize: 15, fontFamily: 'Nunito, sans-serif', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>Notas (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Sin azúcar, sin hielo..." rows={2} style={{ width: '100%', border: '1.5px solid var(--bd2)', borderRadius: 10, padding: '10px 14px', fontSize: 14, resize: 'none', fontFamily: 'Nunito, sans-serif', boxSizing: 'border-box' }} />
              </div>
            </div>

            {pedidoError && (
              <div style={{ background: '#FDEAEA', border: '1px solid rgba(163,32,32,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#A32020', marginBottom: 12, fontWeight: 600 }}>
                {pedidoError}
              </div>
            )}

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 0', borderTop: `2px solid ${C.nv}` }}>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16, color: C.tx }}>Total</span>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 22, color: C.nv }}>{fmt(cartTotal)}</span>
            </div>

            <button onClick={handlePedido} disabled={enviando} style={{ width: '100%', background: enviando ? C.mu : C.or, color: C.wh, border: 'none', borderRadius: 14, padding: '16px', fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17, cursor: enviando ? 'not-allowed' : 'pointer', boxShadow: enviando ? 'none' : '0 4px 16px rgba(232,98,26,0.4)', transition: 'all .2s' }}>
              {enviando ? 'Enviando pedido...' : '🛒 Confirmar pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
