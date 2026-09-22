import React, { useState, useMemo } from 'react'
import { fmt, fmtFechaHora } from '../utils'

export default function CajaEventoModal({
  evento,
  config,
  productos,
  cajasAbiertas,
  onClose,
  onGuardarConsumos,
  onAplicarMenuStock,
  onDeshacerMenuStock,
  onCobrar,
  onDeshacerCobro,
  addToast,
}) {
  const [consumos, setConsumos] = useState(
    (evento.consumos || []).map(c => ({ cobrado: false, ...c }))
  )
  const [searchQ, setSearchQ] = useState('')
  const [selectedProd, setSelectedProd] = useState(null)
  const [qty, setQty] = useState(1)
  const [metodoPago, setMetodoPago] = useState((config.mets || [])[0] || 'Efectivo')
  const [cajaId, setCajaId] = useState(cajasAbiertas[0]?.id || null)
  const [cobrando, setCobrando] = useState(false)
  const [aplicandoMenus, setAplicandoMenus] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)

  const menuStockAplicado = evento.menus_stock_aplicado || false

  const menuItems = useMemo(() => {
    if (!evento.mrows || !evento.mrows.length) return []
    const items = []
    for (const mrow of evento.mrows) {
      const menu = (config.menus || []).find(m => String(m.id) === String(mrow.mid))
      if (!menu || !menu.componentes || !menu.componentes.length) continue
      for (const comp of menu.componentes) {
        const totalQty = comp.cantidad * mrow.qty
        const existing = items.find(i => i.productoId === comp.productoId)
        if (existing) { existing.qty += totalQty }
        else { items.push({ productoId: comp.productoId, nombreProducto: comp.nombre, qty: totalQty, menuNombre: menu.n }) }
      }
    }
    return items
  }, [evento.mrows, config.menus])

  const hasMenuComponentes = menuItems.length > 0

  const articulosItems = useMemo(() => {
    return (evento.articulos || [])
      .filter(a => a.producto_id && a.qty > 0)
      .map(a => ({ productoId: a.producto_id, nombreProducto: a.nombre, qty: a.qty }))
  }, [evento.articulos])

  const hasArticulos = articulosItems.length > 0

  const prodsFiltrados = useMemo(() => {
    if (!searchQ.trim() || selectedProd) return []
    const q = searchQ.toLowerCase()
    return productos
      .filter(p => p.activo !== false && (p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)))
      .slice(0, 8)
  }, [searchQ, selectedProd, productos])

  const pendientes = consumos.filter(c => !c.cobrado)
  const cobrados = consumos.filter(c => c.cobrado)
  const totalPendiente = pendientes.reduce((s, c) => s + (c.precioUnitario || 0) * c.qty, 0)
  const totalCobrado = cobrados.reduce((s, c) => s + (c.precioUnitario || 0) * c.qty, 0)

  const handleAddConsumo = async () => {
    if (!selectedProd) { addToast('Seleccioná un producto', 'err'); return }
    if (!qty || qty <= 0) { addToast('Cantidad inválida', 'err'); return }
    const nuevoConsumo = {
      productoId: selectedProd.id,
      nombreProducto: selectedProd.nombre,
      qty: Number(qty),
      precioUnitario: selectedProd.precio_venta || 0,
      cobrado: false,
    }
    const nuevosConsumos = [...consumos, nuevoConsumo]
    try {
      await onGuardarConsumos(evento.id, nuevosConsumos)
      setConsumos(nuevosConsumos)
      setSelectedProd(null); setSearchQ(''); setQty(1)
      addToast('✓ Consumo agregado')
    } catch (e) { addToast('Error: ' + e.message, 'err') }
  }

  const handleRemoveConsumo = async (idx) => {
    const nuevosConsumos = consumos.filter((_, i) => i !== idx)
    try {
      await onGuardarConsumos(evento.id, nuevosConsumos)
      setConsumos(nuevosConsumos)
      addToast('Consumo eliminado')
    } catch (e) { addToast('Error: ' + e.message, 'err') }
  }

  const handleAplicarMenuStock = async () => {
    if (menuStockAplicado || (!hasMenuComponentes && !hasArticulos)) return
    setAplicandoMenus(true)
    try {
      const todosItems = [...menuItems, ...articulosItems]
      await onAplicarMenuStock(evento.id, todosItems)
      addToast('✓ Stock descontado')
    } catch (e) { addToast('Error: ' + e.message, 'err') }
    finally { setAplicandoMenus(false) }
  }

  const handleCobrar = async () => {
    if (!cajaId) { addToast('Seleccioná una caja abierta', 'err'); return }
    if (pendientes.length === 0) { addToast('No hay ítems pendientes de cobro', 'err'); return }
    setCobrando(true)
    try {
      await onCobrar({
        eventoId: evento.id,
        consumosPendientes: pendientes,
        todosConsumos: consumos,
        total: totalPendiente,
        metodoPago,
        cajaId,
      })
      setConsumos(prev => prev.map(c => c.cobrado ? c : { ...c, cobrado: true }))
      setHistorialOpen(false)
      addToast('✓ Cobrado y registrado en caja')
    } catch (e) {
      addToast('Error: ' + e.message, 'err')
    } finally {
      setCobrando(false)
    }
  }

  const handleDeshacerCobro = async () => {
    try {
      await onDeshacerCobro(evento.id, consumos)
      setConsumos(prev => prev.map(c => ({ ...c, cobrado: false })))
    } catch (e) { addToast('Error: ' + e.message, 'err') }
  }

  return (
    <div className="ov op" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dm" style={{ maxWidth: 640 }}>
        <div className="moh">
          <div className="mot">
            <div className="mot-icon">💰</div>
            <span>Caja del evento — {evento.cumple || evento.reservante}</span>
          </div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>

        {/* Info evento */}
        <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 18, color: 'var(--mu)' }}>
          {fmtFechaHora(evento.fecha, evento.hora)} hs · {evento.salon} · {evento.chi} chicos · {evento.adu} adultos
          <span style={{ marginLeft: 12, fontWeight: 700, color: 'var(--nv)' }}>Total evento: {fmt(evento.total || 0)}</span>
        </div>

        {/* Sección: Stock de menús */}
        {(hasMenuComponentes || hasArticulos) && (
          <div style={{ marginBottom: 22 }}>
            <div className="ct" style={{ marginBottom: 8 }}>
              <div className="ct-icon">🍔</div>Stock de menús del evento
            </div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 10 }}>
              Productos de stock consumidos según los menús elegidos al reservar.
            </div>
            {hasMenuComponentes && (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 10 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bd2)', color: 'var(--mu)' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Menú origen</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px' }}>Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--bd2)' }}>
                      <td style={{ padding: '5px 6px', color: 'var(--mu)', fontSize: 12 }}>{it.menuNombre}</td>
                      <td style={{ padding: '5px 6px' }}>{it.nombreProducto}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>{it.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {hasArticulos && (
              <>
                {hasMenuComponentes && <div style={{ marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase' }}>Artículos incluidos</div>}
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--bd2)', color: 'var(--mu)' }}>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Artículo</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px' }}>Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articulosItems.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--bd2)' }}>
                        <td style={{ padding: '5px 6px' }}>{it.nombreProducto}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right' }}>{it.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className={menuStockAplicado ? 'bg2 bsm' : 'bn bsm'}
                disabled={menuStockAplicado || aplicandoMenus}
                onClick={handleAplicarMenuStock}
              >
                {menuStockAplicado
                  ? '✓ Stock descontado'
                  : aplicandoMenus
                    ? 'Descontando...'
                    : `⬇ Descontar stock${hasMenuComponentes && hasArticulos ? ' de menús y artículos' : hasMenuComponentes ? ' de menús' : ' de artículos'}`
                }
              </button>
              {menuStockAplicado && onDeshacerMenuStock && (
                <button className="bdng bsm" onClick={() => onDeshacerMenuStock(evento.id, [...menuItems, ...articulosItems])}>
                  ↩ Deshacer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sección: Ítems pendientes de cobro */}
        <div className="ct" style={{ marginBottom: 8 }}>
          <div className="ct-icon">🛒</div>Ítems a cobrar
          {pendientes.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--amb)', color: 'var(--am)', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
              {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {pendientes.length > 0 ? (
          <>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 8 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd2)', color: 'var(--mu)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>Producto</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px' }}>Cant</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px' }}>P. Unit</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px' }}>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((c, i) => {
                  const realIdx = consumos.indexOf(c)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--bd2)' }}>
                      <td style={{ padding: '5px 6px' }}>{c.nombreProducto}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>{c.qty}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>{fmt(c.precioUnitario || 0)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600 }}>{fmt((c.precioUnitario || 0) * c.qty)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>
                        <button className="bdng" onClick={() => handleRemoveConsumo(realIdx)}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--nv)' }}>Total pendiente: {fmt(totalPendiente)}</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--mu)', padding: '10px 0', marginBottom: 12 }}>
            Sin ítems pendientes. Agregá productos abajo para cobrar.
          </div>
        )}

        {/* Agregar consumo */}
        <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>+ Agregar consumo</div>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              type="text"
              value={selectedProd ? selectedProd.nombre : searchQ}
              onChange={e => { setSearchQ(e.target.value); setSelectedProd(null) }}
              placeholder="Buscar producto por nombre o código..."
              style={{ width: '100%' }}
            />
            {prodsFiltrados.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg)', border: '1px solid var(--bd2)', borderRadius: 8, zIndex: 99, boxShadow: '0 4px 12px rgba(0,0,0,.12)', maxHeight: 200, overflowY: 'auto' }}>
                {prodsFiltrados.map(p => (
                  <div key={p.id}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--bd2)' }}
                    onMouseDown={() => { setSelectedProd(p); setSearchQ(p.nombre) }}
                  >
                    <strong>{p.nombre}</strong>
                    <span style={{ color: 'var(--mu)', marginLeft: 8 }}>{fmt(p.precio_venta || 0)}</span>
                    {p.maneja_stock !== false && (
                      <span style={{ color: (p.stock_actual || 0) > 0 ? 'var(--gn)' : 'var(--rd)', marginLeft: 8, fontSize: 11 }}>
                        Stock: {p.stock_actual || 0}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="fgg" style={{ flex: '0 0 110px' }}>
              <label>Cantidad</label>
              <input type="number" min={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
            </div>
            {selectedProd && (
              <div style={{ flex: 1, fontSize: 13, color: 'var(--mu)', paddingBottom: 6 }}>
                {fmt(selectedProd.precio_venta || 0)} u · Subtotal: {fmt((selectedProd.precio_venta || 0) * qty)}
              </div>
            )}
            <button className="bp bsm" onClick={handleAddConsumo} style={{ alignSelf: 'flex-end' }}>
              + Agregar
            </button>
          </div>
        </div>

        {/* Cobrar pendientes */}
        {pendientes.length > 0 && (
          <div style={{ background: 'var(--nv3)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--nv)' }}>
              Cobrar {pendientes.length} ítem{pendientes.length !== 1 ? 's' : ''} — {fmt(totalPendiente)}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="fgg" style={{ flex: '1 1 180px' }}>
                <label>Acreditar en caja</label>
                <select value={cajaId || ''} onChange={e => setCajaId(Number(e.target.value))}>
                  {cajasAbiertas.length === 0
                    ? <option value="">Sin cajas abiertas</option>
                    : cajasAbiertas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.turno ? ` — ${c.turno}` : ''}</option>)
                  }
                </select>
              </div>
              <div className="fgg" style={{ flex: '1 1 160px' }}>
                <label>Método de pago</label>
                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                  {(config.mets || []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button className="bn bsm" onClick={handleCobrar} disabled={cobrando || !cajaId} style={{ alignSelf: 'flex-end' }}>
                {cobrando ? 'Procesando...' : '✓ Cobrar y registrar'}
              </button>
            </div>
          </div>
        )}

        {/* Historial de cobros (colapsable) */}
        {cobrados.length > 0 && (
          <div style={{ border: '1px solid rgba(34,197,94,.25)', borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setHistorialOpen(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(34,197,94,.08)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--gn)' }}
            >
              <span>✓ Historial cobrado — {fmt(totalCobrado)} ({cobrados.length} ítem{cobrados.length !== 1 ? 's' : ''})</span>
              <span style={{ fontSize: 11 }}>{historialOpen ? '▲ Ocultar' : '▼ Ver detalle'}</span>
            </button>
            {historialOpen && (
              <div style={{ padding: '10px 14px' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <tbody>
                    {cobrados.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--bd2)' }}>
                        <td style={{ padding: '5px 6px' }}>{c.nombreProducto}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--mu)' }}>×{c.qty}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600 }}>{fmt((c.precioUnitario || 0) * c.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {onDeshacerCobro && (
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="bdng bsm" style={{ fontSize: 12 }} onClick={handleDeshacerCobro}>
                      ↩ Deshacer todo el cobro
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="bg2" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
