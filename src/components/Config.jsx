import React, { useState, useCallback } from 'react'
import { supabase } from '../supabase'


export default function Config({ config, updateConfig, addToast, productos = [], categorias = [], empleados = [], saveEmpleado, toggleEmpleado, deleteEmpleado, askPin }) {
  const [nmN, setNmN] = useState('')
  const [nempN, setNempN] = useState('')
  const [nmP, setNmP] = useState('')
  const [nsN, setNsN] = useState('')
  const [npD, setNpD] = useState('')
  const [npP, setNpP] = useState('')
  const [nmetN, setNmetN] = useState('')
  const [nmetCajaN, setNmetCajaN] = useState('')
  const [neN, setNeN] = useState('')
  const [neP, setNeP] = useState('')
  const [cfgPc, setCfgPc] = useState(config.pChico)
  const [cfgPa, setCfgPa] = useState(config.pAdulto)
  const [pricesOk, setPricesOk] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [pinOk, setPinOk] = useState(false)
  const [nuevaClavNombre, setNuevaClavNombre] = useState('')
  const [nuevaClavPin, setNuevaClavPin] = useState('')
  const [editClavIdx, setEditClavIdx] = useState(null)
  const [editClavPin, setEditClavPin] = useState('')
  const [auditLog, setAuditLog] = useState(null) // null = no cargado, [] = vacío
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFiltro, setAuditFiltro] = useState('')
  const [auditDesde, setAuditDesde] = useState('')
  const [auditHasta, setAuditHasta] = useState('')
  const [menuExpandido, setMenuExpandido] = useState(null)
  const [compProdSearch, setCompProdSearch] = useState('')
  const [compProdSel, setCompProdSel] = useState(null)
  const [compCant, setCompCant] = useState(1)

  // ── Menú digital ──
  const _md = config.menu_digital || {}
  const [mdActivo, setMdActivo] = useState(_md.activo || false)
  const [mdTitulo, setMdTitulo] = useState(_md.titulo || 'Kangoo Cumples')
  const [mdSubtitulo, setMdSubtitulo] = useState(_md.subtitulo || '')
  const [mdLogoUrl, setMdLogoUrl] = useState(_md.logoUrl || '')
  const [mdProductosIds, setMdProductosIds] = useState(_md.productosIds || [])

  const toggleMdProd = id => setMdProductosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const saveMenuDigital = async () => {
    await updateConfig('menu_digital', { activo: mdActivo, titulo: mdTitulo, subtitulo: mdSubtitulo, logoUrl: mdLogoUrl, productosIds: mdProductosIds })
    addToast('✓ Menú digital guardado')
  }

  const menuUrl = typeof window !== 'undefined' ? `${window.location.origin}/menu` : '/menu'
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(menuUrl)}&bgcolor=ffffff&color=1B3A6B&margin=8`

  // Agrupar productos activos por categoría para el selector
  const prodsPorCat = categorias.map(cat => ({
    ...cat,
    items: productos.filter(p => p.activo !== false && p.categoria_id === cat.id),
  })).filter(g => g.items.length > 0)
  const sinCat = productos.filter(p => p.activo !== false && !p.categoria_id)
  if (sinCat.length > 0) prodsPorCat.push({ id: null, nombre: 'Sin categoría', items: sinCat })

  // Productos simples disponibles para componentes de menú
  const productosSimples = productos.filter(p => p.activo !== false)
  const compProdsFiltrados = compProdSearch.trim() && !compProdSel
    ? productosSimples.filter(p =>
        p.nombre.toLowerCase().includes(compProdSearch.toLowerCase()) ||
        (p.codigo || '').toLowerCase().includes(compProdSearch.toLowerCase())
      ).slice(0, 6)
    : []

  // ── Menús ──
  const addMenu = () => {
    const n = nmN.trim()
    if (!n) { addToast('Completá el nombre del menú', 'err'); return }
    const p = parseFloat(nmP) || 0
    const updated = [...config.menus, { id: Date.now(), n, p, componentes: [] }]
    updateConfig('menus', updated)
    setNmN(''); setNmP('')
    addToast('Menú agregado ✓')
  }
  const delMenu = id => { updateConfig('menus', config.menus.filter(m => m.id !== id)); addToast('Menú eliminado') }
  const updateMenuPrice = (id, val) => {
    updateConfig('menus', config.menus.map(m => m.id === id ? { ...m, p: parseFloat(val) || 0 } : m))
    addToast('Precio de menú actualizado ✓')
  }

  const addCompToMenu = (menuId) => {
    if (!compProdSel) { addToast('Seleccioná un producto', 'err'); return }
    if (!compCant || compCant <= 0) { addToast('Cantidad inválida', 'err'); return }
    const menu = config.menus.find(m => m.id === menuId)
    const comps = menu.componentes || []
    if (comps.find(c => c.productoId === compProdSel.id)) {
      addToast('Ese producto ya está en los componentes del menú', 'err'); return
    }
    const newComps = [...comps, { productoId: compProdSel.id, nombre: compProdSel.nombre, cantidad: Number(compCant) }]
    updateConfig('menus', config.menus.map(m => m.id === menuId ? { ...m, componentes: newComps } : m))
    setCompProdSel(null); setCompProdSearch(''); setCompCant(1)
    addToast('Componente agregado ✓')
  }

  const delCompFromMenu = (menuId, productoId) => {
    const menu = config.menus.find(m => m.id === menuId)
    const newComps = (menu.componentes || []).filter(c => c.productoId !== productoId)
    updateConfig('menus', config.menus.map(m => m.id === menuId ? { ...m, componentes: newComps } : m))
    addToast('Componente eliminado')
  }

  // ── Salones ──
  const addSalon = () => {
    const n = nsN.trim()
    if (!n) return
    if (config.salones.includes(n)) { addToast('Ese salón ya existe', 'err'); return }
    updateConfig('salones', [...config.salones, n])
    setNsN('')
    addToast('Salón agregado ✓')
  }
  const delSalon = s => { updateConfig('salones', config.salones.filter(x => x !== s)); addToast('Salón eliminado') }

  // ── Promos ──
  const addPromo = () => {
    const d = npD.trim(); const p = parseFloat(npP)
    if (!d || !p) { addToast('Completá descripción y porcentaje', 'err'); return }
    updateConfig('promos', [...config.promos, { id: Date.now(), d, pct: p }])
    setNpD(''); setNpP('')
    addToast('Promoción agregada ✓')
  }
  const delPromo = id => { updateConfig('promos', config.promos.filter(p => p.id !== id)); addToast('Promo eliminada') }

  // ── Métodos pago (cumpleaños) ──
  const addMet = () => {
    const n = nmetN.trim()
    if (!n) return
    if (config.mets.includes(n)) { addToast('Ese método ya existe', 'err'); return }
    updateConfig('mets', [...config.mets, n])
    setNmetN('')
    addToast('Método de pago agregado ✓')
  }
  const delMet = m => { updateConfig('mets', config.mets.filter(x => x !== m)); addToast('Método eliminado') }

  // ── Métodos pago (caja/ventas) ──
  const metsCaja = config.mets_caja || []
  const addMetCaja = () => {
    const n = nmetCajaN.trim()
    if (!n) return
    if (metsCaja.includes(n)) { addToast('Ese método ya existe', 'err'); return }
    updateConfig('mets_caja', [...metsCaja, n])
    setNmetCajaN('')
    addToast('Método de pago agregado ✓')
  }
  const delMetCaja = m => { updateConfig('mets_caja', metsCaja.filter(x => x !== m)); addToast('Método eliminado') }

  // ── Empleados ──
  const addEmp = async () => {
    const n = nempN.trim()
    if (!n) { addToast('Ingresá el nombre del empleado', 'err'); return }
    try { await saveEmpleado(n); setNempN(''); addToast('Empleado agregado ✓') }
    catch (e) { addToast('Error: ' + e.message, 'err') }
  }

  // ── Extras ──
  const addExtra = () => {
    const n = neN.trim(); const p = parseFloat(neP)
    if (!n || isNaN(p)) { addToast('Completá nombre y precio del extra', 'err'); return }
    updateConfig('extras', [...config.extras, { id: Date.now(), n, p }])
    setNeN(''); setNeP('')
    addToast('Extra agregado ✓')
  }
  const delExtra = id => { updateConfig('extras', config.extras.filter(e => e.id !== id)); addToast('Extra eliminado') }
  const updateExtraPrice = (id, val) => {
    updateConfig('extras', config.extras.map(e => e.id === id ? { ...e, p: parseFloat(val) || 0 } : e))
    addToast('Precio actualizado ✓')
  }

  // ── PIN de seguridad (legacy, no usado) ──
  const savePin = () => {
    const p = newPin.trim()
    if (!/^\d{4}$/.test(p)) { addToast('El código debe ser de exactamente 4 dígitos numéricos', 'err'); return }
    updateConfig('pin', p)
    setNewPin('')
    setPinOk(true)
    setTimeout(() => setPinOk(false), 3000)
    addToast('Código de seguridad guardado ✓')
  }

  // ── Claves de seguridad ──
  const claves = config.claves || []

  const addClave = () => {
    const nombre = nuevaClavNombre.trim().toLowerCase()
    const pin = nuevaClavPin.trim()
    if (!nombre) { addToast('Ingresá un nombre para la clave', 'err'); return }
    if (!/^\d{4}$/.test(pin)) { addToast('El código debe ser exactamente 4 dígitos', 'err'); return }
    if (claves.find(c => c.nombre === nombre)) { addToast('Ya existe una clave con ese nombre', 'err'); return }
    updateConfig('claves', [...claves, { nombre, pin }])
    setNuevaClavNombre(''); setNuevaClavPin('')
    addToast(`Clave "${nombre}" agregada ✓`)
  }

  const deleteClave = (nombre) => {
    updateConfig('claves', claves.filter(c => c.nombre !== nombre))
    addToast(`Clave "${nombre}" eliminada`)
  }

  const startEditClave = (idx) => {
    setEditClavIdx(idx)
    setEditClavPin('')
  }

  const saveEditClave = (idx) => {
    const pin = editClavPin.trim()
    if (!/^\d{4}$/.test(pin)) { addToast('El código debe ser exactamente 4 dígitos', 'err'); return }
    const updated = claves.map((c, i) => i === idx ? { ...c, pin } : c)
    updateConfig('claves', updated)
    setEditClavIdx(null); setEditClavPin('')
    addToast(`Código de "${claves[idx].nombre}" actualizado ✓`)
  }

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true)
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) { addToast('Error al cargar historial: ' + error.message, 'err') }
    else { setAuditLog(data || []) }
    setAuditLoading(false)
  }, [addToast])

  // ── Precios base ──
  const savePrices = () => {
    updateConfig('pChico', parseFloat(cfgPc) || 0)
    updateConfig('pAdulto', parseFloat(cfgPa) || 0)
    setPricesOk(true)
    setTimeout(() => setPricesOk(false), 3000)
    addToast('Precios guardados ✓')
  }

  return (
    <>
      <div className="ph">
        <div>
          <div className="pt">Datos de venta</div>
          <div className="ps">Precios, menús, extras, salones, promociones y métodos de pago</div>
        </div>
      </div>

      <div className="cg">
        {/* Menús */}
        <div className="cc">
          <div className="ct"><div className="ct-icon">🍔</div>Menús disponibles</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 10 }}>
            Hacé clic en un menú para editar sus componentes de stock (qué se descuenta del inventario por cada unidad).
          </div>
          {config.menus.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--mu)', padding: '8px 0' }}>Sin menús cargados</div>
            : config.menus.map(m => {
              const isExpanded = menuExpandido === m.id
              const comps = m.componentes || []
              return (
                <div key={m.id} style={{ border: '1px solid var(--bd2)', borderRadius: 8, marginBottom: 8 }}>
                  <div className="li" style={{ borderBottom: isExpanded ? '1px solid var(--bd2)' : 'none', cursor: 'pointer' }} onClick={() => setMenuExpandido(isExpanded ? null : m.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--mu)' }}>{isExpanded ? '▾' : '▸'}</span>
                      <span className="lin">{m.n}</span>
                      {comps.length > 0 && (
                        <span style={{ fontSize: 11, background: 'var(--nv3)', color: 'var(--nv)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                          {comps.length} componente{comps.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        defaultValue={m.p || 0}
                        min={0}
                        style={{ width: 110, border: '1px solid var(--bd2)', borderRadius: 7, padding: '5px 9px', fontSize: 13, background: 'var(--bg)' }}
                        onBlur={ev => updateMenuPrice(m.id, ev.target.value)}
                        title="Precio por chico con este menú"
                      />
                      <button className="bdng" onClick={() => delMenu(m.id)}>✕</button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '12px 14px', background: 'var(--bg2)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--mu)' }}>
                        Componentes de stock por unidad de menú
                      </div>
                      {comps.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 10 }}>Sin componentes cargados — agregá productos del inventario.</div>
                      ) : (
                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 10 }}>
                          <thead>
                            <tr style={{ color: 'var(--mu)', borderBottom: '1px solid var(--bd2)' }}>
                              <th style={{ textAlign: 'left', padding: '3px 4px' }}>Producto</th>
                              <th style={{ textAlign: 'right', padding: '3px 4px' }}>Cant/menú</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {comps.map(c => (
                              <tr key={c.productoId} style={{ borderBottom: '1px solid var(--bd2)' }}>
                                <td style={{ padding: '5px 4px' }}>{c.nombre}</td>
                                <td style={{ padding: '5px 4px', textAlign: 'right' }}>{c.cantidad}</td>
                                <td style={{ padding: '5px 4px', textAlign: 'right' }}>
                                  <button className="bdng" style={{ fontSize: 11, padding: '1px 6px' }} onClick={() => delCompFromMenu(m.id, c.productoId)}>✕</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Agregar componente */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 180px', position: 'relative' }}>
                          <input
                            type="text"
                            value={compProdSel ? compProdSel.nombre : compProdSearch}
                            onChange={e => { setCompProdSearch(e.target.value); setCompProdSel(null) }}
                            placeholder="Buscar producto de inventario..."
                            style={{ width: '100%', fontSize: 12 }}
                          />
                          {compProdsFiltrados.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg)', border: '1px solid var(--bd2)', borderRadius: 7, zIndex: 99, boxShadow: '0 4px 12px rgba(0,0,0,.12)', maxHeight: 160, overflowY: 'auto' }}>
                              {compProdsFiltrados.map(p => (
                                <div
                                  key={p.id}
                                  style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--bd2)' }}
                                  onMouseDown={() => { setCompProdSel(p); setCompProdSearch(p.nombre) }}
                                >
                                  {p.nombre}
                                  {p.unidad && <span style={{ color: 'var(--mu)', marginLeft: 6 }}>({p.unidad})</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ flex: '0 0 90px' }}>
                          <input
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={compCant}
                            onChange={e => setCompCant(e.target.value)}
                            placeholder="Cant"
                            style={{ width: '100%', fontSize: 12 }}
                          />
                        </div>
                        <button className="bp bsm" style={{ fontSize: 12 }} onClick={() => addCompToMenu(m.id)}>
                          + Agregar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          }
          <div className="ar">
            <input type="text" value={nmN} onChange={e => setNmN(e.target.value)} placeholder="Nombre del menú" style={{ flex: 2 }} />
            <input type="number" value={nmP} onChange={e => setNmP(e.target.value)} placeholder="$ precio" style={{ width: 120, flex: 'none' }} />
            <button className="bp bsm" onClick={addMenu}>+ Agregar</button>
          </div>
        </div>

        {/* Precio base + Salones */}
        <div className="cc">
          <div className="ct"><div className="ct-icon">💰</div>Precio base</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="fgg">
              <label>Por chico</label>
              <input type="number" value={cfgPc} onChange={e => setCfgPc(e.target.value)} placeholder="$" />
            </div>
            <div className="fgg">
              <label>Por adulto</label>
              <input type="number" value={cfgPa} onChange={e => setCfgPa(e.target.value)} placeholder="$" />
            </div>
          </div>
          <button className="bn bsm" onClick={savePrices} style={{ width: '100%' }}>💾 Guardar precios</button>
          {pricesOk && (
            <div style={{ fontSize: 13, color: 'var(--gn)', marginTop: 8, fontWeight: 600 }}>✓ Precios guardados correctamente</div>
          )}

          <div className="ct" style={{ marginTop: 22 }}><div className="ct-icon">🏠</div>Salones</div>
          {config.salones.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--mu)', padding: '8px 0' }}>Sin salones</div>
            : config.salones.map(s => (
              <div key={s} className="li">
                <span className="lin">{s}</span>
                <button className="bdng" onClick={() => delSalon(s)}>✕</button>
              </div>
            ))
          }
          <div className="ar">
            <input type="text" value={nsN} onChange={e => setNsN(e.target.value)} placeholder="Nombre del salón" />
            <button className="bp bsm" onClick={addSalon}>+ Agregar</button>
          </div>
        </div>

        {/* Promos */}
        <div className="cc">
          <div className="ct"><div className="ct-icon">🎁</div>Promociones</div>
          {config.promos.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--mu)', padding: '8px 0' }}>Sin promociones</div>
            : config.promos.map(p => (
              <div key={p.id} className="li">
                <span>{p.d}<span className="pbg">{p.pct}% off</span></span>
                <button className="bdng" onClick={() => delPromo(p.id)}>✕</button>
              </div>
            ))
          }
          <div className="ar">
            <input type="text" value={npD} onChange={e => setNpD(e.target.value)} placeholder="Descripción de la promo" style={{ flex: 2 }} />
            <input type="number" value={npP} onChange={e => setNpP(e.target.value)} placeholder="% dto" style={{ width: 90, flex: 'none' }} />
            <button className="bp bsm" onClick={addPromo}>+ Agregar</button>
          </div>
        </div>

        {/* Métodos pago cumpleaños */}
        <div className="cc">
          <div className="ct"><div className="ct-icon">💳</div>Métodos de pago (cumpleaños)</div>
          {config.mets.map(m => (
            <div key={m} className="li">
              <span className="lin">{m}</span>
              <button className="bdng" onClick={() => delMet(m)}>✕</button>
            </div>
          ))}
          <div className="ar">
            <input type="text" value={nmetN} onChange={e => setNmetN(e.target.value)} placeholder="Ej: Efectivo, Transferencia..." />
            <button className="bp bsm" onClick={addMet}>+ Agregar</button>
          </div>
        </div>

        {/* Métodos pago caja/ventas */}
        <div className="cc">
          <div className="ct"><div className="ct-icon">🏧</div>Métodos de pago (caja / ventas)</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 10 }}>
            Usados en ventas de caja y compras a proveedores.
          </div>
          {metsCaja.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--mu)', padding: '8px 0' }}>Sin métodos cargados</div>
            : metsCaja.map(m => (
              <div key={m} className="li">
                <span className="lin">{m}</span>
                <button className="bdng" onClick={() => delMetCaja(m)}>✕</button>
              </div>
            ))
          }
          <div className="ar">
            <input type="text" value={nmetCajaN} onChange={e => setNmetCajaN(e.target.value)} placeholder="Ej: Efectivo, Transferencia..." />
            <button className="bp bsm" onClick={addMetCaja}>+ Agregar</button>
          </div>
        </div>

        {/* Empleados */}
        <div className="cc" style={{ gridColumn: '1/-1' }}>
          <div className="ct"><div className="ct-icon">👤</div>Empleados</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 12 }}>
            Los empleados activos aparecen disponibles para asignar en cada venta.
          </div>
          {empleados.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--mu)', padding: '8px 0' }}>Sin empleados cargados</div>
            : empleados.map(e => (
              <div key={e.id} className="li">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="lin" style={{ color: e.activo ? undefined : 'var(--mu)', textDecoration: e.activo ? 'none' : 'line-through' }}>{e.nombre}</span>
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 4, fontWeight: 700, background: e.activo ? 'rgba(34,197,94,.12)' : 'var(--bg2)', color: e.activo ? 'var(--gn)' : 'var(--mu)' }}>
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="bg2 bsm" onClick={() => toggleEmpleado(e.id, !e.activo)}>
                    {e.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button className="bdng" onClick={() => askPin(`Vas a eliminar al empleado ${e.nombre}.`, () => deleteEmpleado(e.id))}>✕</button>
                </div>
              </div>
            ))
          }
          <div className="ar">
            <input type="text" value={nempN} onChange={e => setNempN(e.target.value)} placeholder="Nombre del empleado" onKeyDown={ev => ev.key === 'Enter' && addEmp()} />
            <button className="bp bsm" onClick={addEmp}>+ Agregar</button>
          </div>
        </div>

        {/* Claves de seguridad */}
        <div className="cc">
          <div className="ct"><div className="ct-icon">🔐</div>Claves de seguridad</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 12 }}>
            Cada clave tiene un nombre y un código de 4 dígitos. Cualquier clave válida autoriza una acción, y queda registrado cuál se usó.
          </div>

          {/* Lista de claves existentes */}
          {claves.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--mu2)', marginBottom: 12 }}>No hay claves configuradas aún.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {claves.map((c, idx) => (
                <div key={c.nombre} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{c.nombre}</span>
                  {editClavIdx === idx ? (
                    <>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={editClavPin}
                        onChange={e => setEditClavPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="Nuevo código"
                        style={{ width: 120, letterSpacing: 4, fontSize: 14 }}
                        autoFocus
                      />
                      <button className="bn bsm" onClick={() => saveEditClave(idx)}>✓</button>
                      <button className="bg2 bsm" onClick={() => setEditClavIdx(null)}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--mu)', fontFamily: 'monospace', letterSpacing: 4 }}>••••</span>
                      <button className="bg2 bsm" onClick={() => startEditClave(idx)}>Cambiar código</button>
                      <button className="bdng bsm" onClick={() => deleteClave(c.nombre)}>✕</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Agregar nueva clave */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="fgg" style={{ flex: '1 1 140px' }}>
              <label>Nombre de la clave</label>
              <input
                value={nuevaClavNombre}
                onChange={e => setNuevaClavNombre(e.target.value)}
                placeholder="Ej: joaco"
              />
            </div>
            <div className="fgg" style={{ flex: '0 0 140px' }}>
              <label>Código (4 dígitos)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={nuevaClavPin}
                onChange={e => setNuevaClavPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                style={{ letterSpacing: 4 }}
              />
            </div>
            <button className="bn bsm" onClick={addClave} style={{ marginBottom: 2 }}>+ Agregar clave</button>
          </div>
        </div>

        {/* Extras */}
        <div className="cc" style={{ gridColumn: '1/-1' }}>
          <div className="ct"><div className="ct-icon">⭐</div>Extras disponibles para cobrar</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 12 }}>
            Estos ítems aparecerán en cada evento para sumar al total. Podés editar el precio desde acá y se actualiza en todos los eventos nuevos.
          </div>
          {config.extras.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--mu)', padding: '8px 0' }}>Sin extras cargados</div>
            : config.extras.map(e => (
              <div key={e.id} className="li">
                <span className="lin">{e.n}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    defaultValue={e.p}
                    min={0}
                    style={{ width: 110, border: '1px solid var(--bd2)', borderRadius: 7, padding: '5px 9px', fontSize: 13, background: 'var(--bg)' }}
                    onBlur={ev => updateExtraPrice(e.id, ev.target.value)}
                    title="Cambiar precio"
                  />
                  <button className="bdng" onClick={() => delExtra(e.id)}>✕</button>
                </div>
              </div>
            ))
          }
          <div className="ar">
            <input type="text" value={neN} onChange={e => setNeN(e.target.value)} placeholder="Nombre del extra" style={{ flex: 2 }} />
            <input type="number" value={neP} onChange={e => setNeP(e.target.value)} placeholder="$ precio unitario" style={{ width: 160, flex: 'none' }} />
            <button className="bp bsm" onClick={addExtra}>+ Agregar extra</button>
          </div>
        </div>

        {/* Menú Digital */}
        <div className="cc" style={{ gridColumn: '1/-1' }}>
          <div className="ct"><div className="ct-icon">📱</div>Menú digital (QR)</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 16 }}>
            Publicá una página con tus productos y precios accesible por QR. Los clientes la ven desde su celular con los colores del parque.
          </div>

          {/* Toggle activo */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            {[{ v: true, l: '✓ Activo' }, { v: false, l: '✗ Inactivo' }].map(({ v, l }) => (
              <button key={String(v)} type="button"
                className={`rp ${mdActivo === v ? 'spaid' : ''}`}
                onClick={() => setMdActivo(v)}
                style={{ flex: 1, textAlign: 'center' }}
              >{l}</button>
            ))}
          </div>

          <div className="fg" style={{ marginBottom: 14 }}>
            <div className="fgg">
              <label>Título del menú</label>
              <input value={mdTitulo} onChange={e => setMdTitulo(e.target.value)} placeholder="Ej: Kangoo Cumples" />
            </div>
            <div className="fgg">
              <label>Subtítulo</label>
              <input value={mdSubtitulo} onChange={e => setMdSubtitulo(e.target.value)} placeholder="Ej: Consultá nuestros precios" />
            </div>
            <div className="fgg" style={{ gridColumn: '1/-1' }}>
              <label>URL del logo (imagen)</label>
              <input value={mdLogoUrl} onChange={e => setMdLogoUrl(e.target.value)} placeholder="https://... (URL de imagen, opcional)" />
            </div>
          </div>

          {/* Selector de productos */}
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--nv)', marginBottom: 10 }}>
            Productos a mostrar en el menú ({mdProductosIds.length} seleccionados)
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <button type="button" className="bg2 bsm" onClick={() => setMdProductosIds(productos.filter(p => p.activo !== false).map(p => p.id))}>
              Seleccionar todos
            </button>
            <button type="button" className="bg2 bsm" onClick={() => setMdProductosIds([])}>
              Quitar todos
            </button>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--bd2)', borderRadius: 10, padding: '10px 12px', marginBottom: 16, background: 'var(--bg)' }}>
            {prodsPorCat.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--mu)' }}>Sin productos cargados. Primero creá productos desde el módulo Ventas → Productos.</div>
              : prodsPorCat.map(cat => (
                <div key={cat.id || 'sin'} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--or, #E8621A)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                    {cat.nombre}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cat.items.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 6px', borderRadius: 7, background: mdProductosIds.includes(p.id) ? 'var(--nv3)' : 'transparent' }}>
                        <input type="checkbox" checked={mdProductosIds.includes(p.id)} onChange={() => toggleMdProd(p.id)} style={{ width: 15, height: 15, accentColor: 'var(--nv)' }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.nombre}</span>
                        <span style={{ fontSize: 13, color: 'var(--gn)', fontWeight: 700 }}>
                          ${Number(p.precio_venta || 0).toLocaleString('es-AR')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>

          <button className="bn" onClick={saveMenuDigital} style={{ marginBottom: 24 }}>
            Guardar menú digital
          </button>

          {/* QR y URL */}
          {mdActivo && (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', background: 'var(--nv3)', borderRadius: 12, padding: 20 }}>
              <img src={qrUrl} alt="QR del menú" style={{ width: 140, height: 140, borderRadius: 8, border: '1px solid var(--bd2)', background: '#fff' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--nv)', marginBottom: 8 }}>Tu menú digital está activo</div>
                <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 10 }}>Escaneá el QR o compartí este link con tus clientes:</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <code style={{ fontSize: 12, background: 'var(--wh)', border: '1px solid var(--bd2)', padding: '6px 10px', borderRadius: 7, color: 'var(--nv)', wordBreak: 'break-all' }}>
                    {menuUrl}
                  </code>
                  <button className="bg2 bsm" onClick={() => { navigator.clipboard.writeText(menuUrl); addToast('✓ Link copiado') }}>
                    Copiar link
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 10 }}>
                  Imprimí el QR y pegalo en las mesas, salones o entrada para que los clientes puedan verlo desde su celular.
                </div>
              </div>
            </div>
          )}
          {!mdActivo && (
            <div style={{ fontSize: 13, color: 'var(--mu)', background: 'var(--bg2)', borderRadius: 10, padding: '12px 16px' }}>
              Activá el menú digital arriba para ver el QR y el link público.
            </div>
          )}
        </div>
        {/* Historial de autorizaciones */}
        <div className="cc" style={{ gridColumn: '1/-1' }}>
          <div className="ct"><div className="ct-icon">📋</div>Historial de autorizaciones</div>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 12 }}>
            Registro de todas las acciones sensibles autorizadas con clave, con fecha/hora y qué clave se usó.
          </div>

          {auditLog === null ? (
            <button className="bn bsm" onClick={fetchAuditLog} disabled={auditLoading}>
              {auditLoading ? 'Cargando...' : '🔍 Ver historial'}
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  placeholder="Filtrar por clave o acción..."
                  value={auditFiltro}
                  onChange={e => setAuditFiltro(e.target.value)}
                  style={{ flex: 1, minWidth: 180 }}
                />
                <input type="date" value={auditDesde} onChange={e => setAuditDesde(e.target.value)}
                  style={{ width: 145 }} title="Desde" />
                <input type="date" value={auditHasta} onChange={e => setAuditHasta(e.target.value)}
                  style={{ width: 145 }} title="Hasta" />
                {(auditDesde || auditHasta || auditFiltro) && (
                  <button className="bg2 bsm" onClick={() => { setAuditDesde(''); setAuditHasta(''); setAuditFiltro('') }}>
                    ✕ Limpiar
                  </button>
                )}
                <button className="bg2 bsm" onClick={fetchAuditLog} disabled={auditLoading}>
                  {auditLoading ? '...' : '↺ Actualizar'}
                </button>
                <span style={{ fontSize: 12, color: 'var(--mu)' }}>
                  {auditLog.length} registros
                </span>
              </div>

              {(() => {
                const filtrados = auditLog.filter(r => {
                  if (auditFiltro.trim()) {
                    const q = auditFiltro.toLowerCase()
                    if (!r.clave_nombre?.toLowerCase().includes(q) && !r.accion?.toLowerCase().includes(q)) return false
                  }
                  if (auditDesde) {
                    if (r.created_at.slice(0, 10) < auditDesde) return false
                  }
                  if (auditHasta) {
                    if (r.created_at.slice(0, 10) > auditHasta) return false
                  }
                  return true
                })
                return filtrados.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--mu2)', padding: '10px 0' }}>
                    Sin resultados para los filtros aplicados.
                  </div>
                ) : (
                  <div className="vtable-wrap">
                    <table className="vtable">
                      <thead>
                        <tr>
                          <th>Fecha y hora</th>
                          <th>Clave</th>
                          <th>Acción autorizada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map(r => {
                          const dt = new Date(r.created_at)
                          const fecha = dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          const hora = dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                          return (
                            <tr key={r.id}>
                              <td style={{ fontSize: 12, color: 'var(--mu)', whiteSpace: 'nowrap' }}>{fecha} {hora}</td>
                              <td>
                                <span style={{ background: 'var(--nv3)', color: 'var(--nv)', fontWeight: 700, fontSize: 12, padding: '2px 10px', borderRadius: 20 }}>
                                  {r.clave_nombre}
                                </span>
                              </td>
                              <td style={{ fontSize: 13 }}>{r.accion}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </>
          )}
        </div>

      </div>
    </>
  )
}
