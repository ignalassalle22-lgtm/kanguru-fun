import React, { useState, useMemo } from 'react'

const fmt = n => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

function tiempoTranscurrido(created_at) {
  const diff = Math.floor((Date.now() - new Date(created_at)) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

const ESTADOS = [
  { id: 'pendiente',       label: 'Pendiente',        color: '#A86200', bg: '#FFF3D4', dot: '#E8A000' },
  { id: 'en_preparacion',  label: 'En preparación',   color: '#1B3A6B', bg: '#EBF0FA', dot: '#2B5299' },
  { id: 'listo',           label: 'Listo',            color: '#1A7A45', bg: '#E8F5EE', dot: '#22C55E' },
]

export default function Pedidos({ pedidos, loading, onUpdateEstado, onCobrar, onAnular }) {
  const [filtro, setFiltro] = useState('todos')

  const filtrados = useMemo(() => {
    if (filtro === 'todos') return pedidos
    return pedidos.filter(p => p.estado === filtro)
  }, [pedidos, filtro])

  const counts = useMemo(() => ({
    todos: pedidos.length,
    pendiente: pedidos.filter(p => p.estado === 'pendiente').length,
    en_preparacion: pedidos.filter(p => p.estado === 'en_preparacion').length,
    listo: pedidos.filter(p => p.estado === 'listo').length,
  }), [pedidos])

  if (loading) return (
    <div className="sec">
      <div className="empty"><div className="emj">⏳</div><p>Cargando pedidos...</p></div>
    </div>
  )

  return (
    <div className="sec">
      <div className="ph">
        <div>
          <div className="pt">Pedidos</div>
          <div className="ps">Pedidos recibidos desde el menú digital · en tiempo real</div>
        </div>
      </div>

      {/* Tabs de filtro */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'todos', label: 'Todos', count: counts.todos },
          ...ESTADOS.map(e => ({ id: e.id, label: e.label, count: counts[e.id] })),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFiltro(tab.id)}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: filtro === tab.id ? 'var(--nv)' : 'var(--wh)',
              color: filtro === tab.id ? '#fff' : 'var(--mu)',
              boxShadow: filtro === tab.id ? '0 2px 8px rgba(27,58,107,0.2)' : '0 1px 4px rgba(27,58,107,0.08)',
              transition: 'all .15s',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                marginLeft: 6, background: filtro === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--nv3)',
                color: filtro === tab.id ? '#fff' : 'var(--nv)',
                borderRadius: 10, padding: '1px 7px', fontSize: 11,
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="empty">
          <div className="emj">📋</div>
          <p>{pedidos.length === 0 ? 'Cuando los clientes hagan pedidos desde el menú digital aparecerán acá.' : 'No hay pedidos con este filtro.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtrados.map(p => {
            const est = ESTADOS.find(e => e.id === p.estado) || ESTADOS[0]
            return (
              <div key={p.id} style={{
                background: 'var(--wh)', borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(27,58,107,0.09)',
                border: `1px solid ${p.estado === 'listo' ? 'rgba(34,197,94,.3)' : 'var(--bd)'}`,
              }}>
                {/* Header tarjeta */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--nv)', fontFamily: 'Nunito, sans-serif' }}>#{p.numero}</span>
                    {p.mesa && (
                      <span style={{ fontSize: 11, background: 'var(--nv3)', color: 'var(--nv2)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                        Mesa {p.mesa}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--mu)', fontWeight: 600 }}>{tiempoTranscurrido(p.created_at)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: est.bg, color: est.color }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: est.dot, marginRight: 5 }} />
                      {est.label}
                    </span>
                  </div>
                </div>

                {/* Nombre cliente */}
                <div style={{ padding: '10px 16px 6px', fontWeight: 700, fontSize: 15, color: 'var(--tx)' }}>
                  {p.nombre}
                </div>

                {/* Items */}
                <div style={{ padding: '0 16px 10px' }}>
                  {(p.pedido_items || []).map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: 'var(--mu)', borderBottom: '1px solid var(--bd)' }}>
                      <span>{it.nombre_producto} <span style={{ fontWeight: 700 }}>×{it.cantidad}</span></span>
                      <span style={{ fontWeight: 600, color: 'var(--tx)' }}>{fmt(it.subtotal)}</span>
                    </div>
                  ))}
                  {p.notas && (
                    <div style={{ fontSize: 12, color: 'var(--am)', background: 'var(--amb)', borderRadius: 6, padding: '5px 8px', marginTop: 8 }}>
                      📝 {p.notas}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, fontWeight: 800, fontSize: 15, color: 'var(--nv)' }}>
                    Total: {fmt(p.total)}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--bd)' }}>
                  {p.estado === 'pendiente' && (
                    <button className="bn bsm" style={{ flex: 1 }} onClick={() => onUpdateEstado(p.id, 'en_preparacion')}>
                      👨‍🍳 En preparación
                    </button>
                  )}
                  {p.estado === 'en_preparacion' && (
                    <button className="bn bsm" style={{ flex: 1, background: 'var(--gn)' }} onClick={() => onUpdateEstado(p.id, 'listo')}>
                      ✓ Marcar listo
                    </button>
                  )}
                  {p.estado === 'listo' && (
                    <button className="bp bsm" style={{ flex: 1 }} onClick={() => onCobrar(p)}>
                      $ Cobrar pedido
                    </button>
                  )}
                  <button className="bg2 bsm" onClick={() => onCobrar(p)} title="Cobrar ahora sin esperar">
                    $ Cobrar
                  </button>
                  <button
                    className="bsm"
                    style={{ background: 'none', border: '1.5px solid #e5e7eb', color: '#6B7A99', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                    onClick={() => onAnular(p.id)}
                    title="Cancelar pedido"
                  >✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
