import React, { useState, useEffect } from 'react'

const EMPTY = {
  codigo: '', nombre: '', categoria_id: '', tipo: 'simple',
  precio_venta: '', precio_costo: '', unidad: 'unidad',
  stock_actual: '', stock_minimo: '', activo: true, maneja_stock: true, componentes: []
}

export default function ProductoModal({ producto, productos, categorias, onSave, onClose, addToast, onNuevaCat }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [nuevaCat, setNuevaCat] = useState('')
  const [showNuevaCat, setShowNuevaCat] = useState(false)
  const [compSearch, setCompSearch] = useState('')
  const [compSelectedId, setCompSelectedId] = useState('')
  const [compQty, setCompQty] = useState(1)
  const [fijoSearch, setFijoSearch] = useState('')
  const [fijoSelectedId, setFijoSelectedId] = useState('')
  const [fijoCantidad, setFijoCantidad] = useState(1)

  useEffect(() => {
    if (producto) {
      setForm({
        ...EMPTY,
        ...producto,
        precio_venta: producto.precio_venta ?? '',
        precio_costo: producto.precio_costo ?? '',
        stock_actual: producto.stock_actual ?? '',
        stock_minimo: producto.stock_minimo ?? '',
        componentes: producto.componentes || [],
      })
    } else {
      setForm(EMPTY)
    }
  }, [producto])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const agregarComponente = () => {
    if (!compSelectedId) return
    const prod = productos.find(p => p.id === Number(compSelectedId))
    if (!prod) return
    if (form.componentes.some(c => c.producto_id === prod.id)) {
      addToast('Ya está en los componentes', 'err'); return
    }
    set('componentes', [...form.componentes, { producto_id: prod.id, nombre: prod.nombre, cantidad: Number(compQty) || 1 }])
    setCompSelectedId(''); setCompQty(1); setCompSearch('')
  }

  const quitarComponente = (pid) => set('componentes', form.componentes.filter(c => c.producto_id !== pid))

  const productosFiltrados = productos.filter(p =>
    p.tipo === 'simple' &&
    (!compSearch || p.nombre.toLowerCase().includes(compSearch.toLowerCase())) &&
    (!producto || p.id !== producto.id)
  )

  async function agregarCat() {
    if (!nuevaCat.trim()) return
    try {
      await onNuevaCat(nuevaCat.trim())
      addToast('✓ Categoría creada')
      setNuevaCat(''); setShowNuevaCat(false)
    } catch (e) { addToast('Error: ' + e.message, 'err') }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { addToast('El nombre es obligatorio', 'err'); return }
    if (form.tipo === 'compuesto' && form.componentes.length === 0) { addToast('Agregá al menos un componente', 'err'); return }
    if (form.tipo === 'variable') {
      const grupos = form.componentes.filter(g => g.tipo !== 'fijo')
      const fijos = form.componentes.filter(g => g.tipo === 'fijo')
      if (grupos.length === 0 && fijos.length === 0) { addToast('Agregá al menos un grupo de opciones o un item fijo', 'err'); return }
      if (grupos.some(g => !g.nombre.trim() || !g.categoria_id)) { addToast('Cada grupo de opciones necesita nombre y categoría', 'err'); return }
      if (fijos.some(f => !f.nombre.trim())) { addToast('Los items fijos necesitan nombre', 'err'); return }
    }
    setSaving(true)
    try {
      const esSimple = form.tipo === 'simple'
      const payload = {
        ...form,
        precio_venta: parseFloat(form.precio_venta) || 0,
        precio_costo: parseFloat(form.precio_costo) || 0,
        stock_actual: esSimple ? (parseFloat(form.stock_actual) || 0) : 0,
        stock_minimo: esSimple ? (parseFloat(form.stock_minimo) || 0) : 0,
        maneja_stock: esSimple ? form.maneja_stock : false,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      }
      await onSave(payload)
    } catch (e) {
      addToast('Error: ' + e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ov op" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mo">
        <div className="moh">
          <div className="mot">
            <div className="mot-icon">📦</div>
            {producto ? 'Editar producto' : 'Nuevo producto'}
          </div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tipo */}
          <div className="sdv">Tipo de producto</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {['simple', 'compuesto', 'variable'].map(t => (
              <button
                key={t} type="button"
                className={`rp ${form.tipo === t ? 'spaid' : ''}`}
                onClick={() => set('tipo', t)}
                style={{ flex: 1, textAlign: 'center' }}
              >
                {t === 'simple' ? '📦 Simple' : t === 'compuesto' ? '🔗 Compuesto' : '🎛️ Variable'}
              </button>
            ))}
          </div>

          {/* Datos básicos */}
          <div className="sdv">Datos del producto</div>
          <div className="fg">
            <div className="fgg">
              <label>Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Gaseosa 500ml" required />
            </div>
            <div className="fgg">
              <label>Código / SKU</label>
              <input value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="Ej: PRD-001" />
            </div>
            <div className="fgg">
              <label>Categoría</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)} style={{ flex: 1 }}>
                  <option value="">Sin categoría</option>
                  {(categorias || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button type="button" className="bg2 bsm" onClick={() => setShowNuevaCat(v => !v)} title="Nueva categoría">＋</button>
              </div>
              {showNuevaCat && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} placeholder="Nombre categoría" style={{ flex: 1 }} />
                  <button type="button" className="bp bsm" onClick={agregarCat}>Agregar</button>
                </div>
              )}
            </div>
            <div className="fgg">
              <label>Unidad</label>
              <select value={form.unidad} onChange={e => set('unidad', e.target.value)}>
                {['unidad', 'kg', 'g', 'l', 'ml', 'porción', 'docena', 'caja', 'pack'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Precios */}
          <div className="sdv">Precios</div>
          <div className="fg">
            <div className="fgg">
              <label>Precio de venta $</label>
              <input type="number" min="0" step="0.01" value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} placeholder="0" />
            </div>
            <div className="fgg">
              <label>Precio de costo $</label>
              <input type="number" min="0" step="0.01" value={form.precio_costo} onChange={e => set('precio_costo', e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Stock (solo simple) */}
          {form.tipo === 'simple' && (
            <>
              <div className="sdv">Stock</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {[{ v: true, l: '📦 Maneja stock' }, { v: false, l: '🚫 Sin control de stock' }].map(({ v, l }) => (
                  <button key={String(v)} type="button"
                    className={`rp ${form.maneja_stock === v ? 'spaid' : ''}`}
                    onClick={() => set('maneja_stock', v)}
                    style={{ flex: 1, textAlign: 'center', fontSize: 13 }}
                  >{l}</button>
                ))}
              </div>
              {form.maneja_stock !== false && (
                <div className="fg">
                  <div className="fgg">
                    <label>Stock actual</label>
                    <input type="number" min="0" step="0.01" value={form.stock_actual} onChange={e => set('stock_actual', e.target.value)} placeholder="0" />
                  </div>
                  <div className="fgg">
                    <label>Stock mínimo (alerta)</label>
                    <input type="number" min="0" step="0.01" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} placeholder="0" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Componentes (solo compuesto) */}
          {form.tipo === 'compuesto' && (
            <>
              <div className="sdv">Componentes</div>
              <p style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 12 }}>
                Un producto compuesto descuenta stock de cada componente al venderse.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-end' }}>
                <div className="fgg" style={{ flex: 2 }}>
                  <label>Buscar producto simple</label>
                  <input
                    value={compSearch}
                    onChange={e => { setCompSearch(e.target.value); setCompSelectedId('') }}
                    placeholder="Nombre del componente..."
                  />
                  {compSearch && productosFiltrados.length > 0 && (
                    <div style={{ border: '1px solid var(--bd2)', borderRadius: 8, background: 'var(--wh)', position: 'absolute', zIndex: 10, maxHeight: 160, overflowY: 'auto', marginTop: 2, minWidth: 260 }}>
                      {productosFiltrados.slice(0, 8).map(p => (
                        <div key={p.id}
                          onClick={() => { setCompSelectedId(String(p.id)); setCompSearch(p.nombre) }}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--nv3)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          {p.nombre} <span style={{ color: 'var(--mu)', fontSize: 12 }}>· stock: {p.stock_actual || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="fgg" style={{ flex: 1 }}>
                  <label>Cantidad</label>
                  <input type="number" min="0.01" step="0.01" value={compQty} onChange={e => setCompQty(e.target.value)} />
                </div>
                <button type="button" className="bn bsm" style={{ flexShrink: 0 }} onClick={agregarComponente}>Agregar</button>
              </div>
              {form.componentes.length > 0 ? (
                <div className="mrc">
                  {form.componentes.map(c => (
                    <div key={c.producto_id} className="mr" style={{ gridTemplateColumns: '1fr 80px auto' }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{c.nombre}</span>
                      <input
                        type="number" min="0.01" step="0.01" value={c.cantidad}
                        onChange={e => set('componentes', form.componentes.map(x => x.producto_id === c.producto_id ? { ...x, cantidad: Number(e.target.value) } : x))}
                        style={{ textAlign: 'center' }}
                      />
                      <button type="button" className="bdng" onClick={() => quitarComponente(c.producto_id)}>✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--mu2)', fontStyle: 'italic' }}>Sin componentes aún.</p>
              )}
            </>
          )}

          {/* Grupos de opciones (solo variable) */}
          {form.tipo === 'variable' && (() => {
            const grupos = form.componentes.filter(g => g.tipo !== 'fijo')
            const fijos = form.componentes.filter(g => g.tipo === 'fijo')
            const updateComp = (newList) => set('componentes', newList)
            return (
              <>
                {/* Grupos con elección */}
                <div className="sdv">Grupos de opciones</div>
                <p style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 12 }}>
                  El empleado elige una opción por grupo. Las opciones son los productos activos de esa categoría.
                </p>
                {grupos.map((g, gi) => {
                  const idx = form.componentes.indexOf(g)
                  return (
                    <div key={gi} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <input
                        value={g.nombre}
                        onChange={e => updateComp(form.componentes.map((x, j) => j === idx ? { ...x, nombre: e.target.value } : x))}
                        placeholder="Nombre del grupo (ej: Bebida)"
                        style={{ flex: 1 }}
                      />
                      <select
                        value={g.categoria_id || ''}
                        onChange={e => updateComp(form.componentes.map((x, j) => j === idx ? { ...x, categoria_id: Number(e.target.value) } : x))}
                        style={{ flex: 1 }}
                      >
                        <option value="">Elegir categoría…</option>
                        {(categorias || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                      <button type="button" className="bdng"
                        onClick={() => updateComp(form.componentes.filter((_, j) => j !== idx))}>✕</button>
                    </div>
                  )
                })}
                <button type="button" className="bg2 bsm"
                  onClick={() => updateComp([...form.componentes, { tipo: 'opcion', nombre: '', categoria_id: '' }])}
                  style={{ marginBottom: 20 }}>+ Agregar grupo de opciones</button>

                {/* Items fijos */}
                <div className="sdv">Incluidos siempre</div>
                <p style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 12 }}>
                  Estos ítems se agregan al ticket automáticamente y se descuenta su stock al vender.
                </p>
                {fijos.length > 0 && (
                  <div className="mrc" style={{ marginBottom: 10 }}>
                    {fijos.map((f, fi) => {
                      const idx = form.componentes.indexOf(f)
                      return (
                        <div key={fi} className="mr" style={{ gridTemplateColumns: '1fr 80px auto' }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{f.nombre}</span>
                          <input
                            type="number" min="0.01" step="0.01" value={f.cantidad || 1}
                            onChange={e => updateComp(form.componentes.map((x, j) => j === idx ? { ...x, cantidad: Number(e.target.value) } : x))}
                            style={{ textAlign: 'center' }}
                          />
                          <button type="button" className="bdng"
                            onClick={() => updateComp(form.componentes.filter((_, j) => j !== idx))}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-end', position: 'relative' }}>
                  <div className="fgg" style={{ flex: 2 }}>
                    <label>Buscar producto fijo</label>
                    <input
                      value={fijoSearch}
                      onChange={e => { setFijoSearch(e.target.value); setFijoSelectedId('') }}
                      placeholder="Nombre del producto…"
                    />
                    {fijoSearch && (() => {
                      const opts = productos.filter(p =>
                        p.tipo !== 'variable' &&
                        (!producto || p.id !== producto.id) &&
                        p.nombre.toLowerCase().includes(fijoSearch.toLowerCase())
                      ).slice(0, 8)
                      return opts.length > 0 ? (
                        <div style={{ border: '1px solid var(--bd2)', borderRadius: 8, background: 'var(--wh)', position: 'absolute', zIndex: 10, maxHeight: 160, overflowY: 'auto', marginTop: 2, minWidth: 260 }}>
                          {opts.map(p => (
                            <div key={p.id}
                              onClick={() => { setFijoSelectedId(String(p.id)); setFijoSearch(p.nombre) }}
                              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--nv3)'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}
                            >
                              {p.nombre}
                              <span style={{ color: 'var(--mu)', fontSize: 12 }}>
                                {p.tipo === 'simple' ? ` · stock: ${p.stock_actual || 0}` : ' · compuesto'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null
                    })()}
                  </div>
                  <div className="fgg" style={{ flex: 1 }}>
                    <label>Cantidad</label>
                    <input type="number" min="0.01" step="0.01" value={fijoCantidad} onChange={e => setFijoCantidad(e.target.value)} />
                  </div>
                  <button type="button" className="bn bsm" style={{ flexShrink: 0 }} onClick={() => {
                    if (!fijoSelectedId) return
                    const prod = productos.find(p => p.id === Number(fijoSelectedId))
                    if (!prod) return
                    if (fijos.some(f => f.producto_id === prod.id)) { addToast('Ya está en los fijos', 'err'); return }
                    updateComp([...form.componentes, { tipo: 'fijo', producto_id: prod.id, nombre: prod.nombre, cantidad: Number(fijoCantidad) || 1 }])
                    setFijoSearch(''); setFijoSelectedId(''); setFijoCantidad(1)
                  }}>Agregar</button>
                </div>
              </>
            )
          })()}

          {/* Estado */}
          <div className="sdv">Estado</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ v: true, l: '✓ Activo' }, { v: false, l: '✗ Inactivo' }].map(({ v, l }) => (
              <button key={String(v)} type="button"
                className={`rp ${form.activo === v ? 'spaid' : ''}`}
                onClick={() => set('activo', v)}
                style={{ flex: 1, textAlign: 'center' }}
              >{l}</button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" className="bg2" onClick={onClose}>Cancelar</button>
            <button type="submit" className="bp" disabled={saving}>
              {saving ? 'Guardando...' : (producto ? 'Guardar cambios' : 'Crear producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
