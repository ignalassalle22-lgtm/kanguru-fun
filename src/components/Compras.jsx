import React, { useState, useMemo } from 'react'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })

const EMPTY_PROV = { nombre: '', cuit: '', obs: '' }

function ProveedorModal({ prov, onSave, onClose }) {
  const [form, setForm] = useState(prov || EMPTY_PROV)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    try { await onSave({ ...form, id: prov?.id }) }
    finally { setSaving(false) }
  }

  return (
    <div className="ov op" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mo" style={{ maxWidth: 460 }}>
        <div className="moh">
          <div className="mot"><div className="mot-icon">🏢</div>{prov?.id ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>
        <div className="fg" style={{ marginTop: 10 }}>
          <div className="fgg" style={{ gridColumn: '1/-1' }}>
            <label>Nombre *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Distribuidora Pérez" autoFocus />
          </div>
          <div className="fgg" style={{ gridColumn: '1/-1' }}>
            <label>CUIT</label>
            <input value={form.cuit} onChange={e => set('cuit', e.target.value)} placeholder="Ej: 20-12345678-9" />
          </div>
          <div className="fgg" style={{ gridColumn: '1/-1' }}>
            <label>Observaciones</label>
            <textarea value={form.obs} onChange={e => set('obs', e.target.value)} placeholder="Días de entrega, contacto, condiciones..." rows={3}
              style={{ border: '1px solid var(--bd2)', borderRadius: 10, padding: '9px 13px', fontSize: 13, resize: 'vertical', width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="bg2" onClick={onClose}>Cancelar</button>
          <button className="bp" onClick={handleSave} disabled={saving || !form.nombre.trim()}>
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Compras({ compras, loading, onNueva, onEditar, onAnular, proveedores = [], onSaveProveedor, onDeleteProveedor, addToast, askPin }) {
  const [tab, setTab] = useState('compras')
  const [busca, setBusca] = useState('')
  const [showDetalle, setShowDetalle] = useState(null)
  const [provModal, setProvModal] = useState(null) // null | {} | {id,...}

  const filtradas = useMemo(() => {
    if (!busca) return compras
    return compras.filter(c =>
      (c.proveedor || '').toLowerCase().includes(busca.toLowerCase()) ||
      (c.numero_remito || '').toLowerCase().includes(busca.toLowerCase())
    )
  }, [compras, busca])

  const stats = useMemo(() => {
    const total = compras.reduce((s, c) => s + (c.total || 0), 0)
    return { count: compras.length, total, provCount: proveedores.length }
  }, [compras, proveedores])

  async function handleSaveProv(prov) {
    try {
      await onSaveProveedor(prov)
      setProvModal(null)
      addToast(prov.id ? '✓ Proveedor actualizado' : '✓ Proveedor creado')
    } catch (e) {
      addToast('Error: ' + e.message, 'err')
    }
  }

  function handleDeleteProv(prov) {
    askPin(`Vas a eliminar el proveedor "${prov.nombre}".`, async () => {
      try {
        await onDeleteProveedor(prov.id)
        addToast('Proveedor eliminado', 'err')
      } catch (e) {
        addToast('Error: ' + e.message, 'err')
      }
    })
  }

  return (
    <div className="sec">
      <div className="ph">
        <div>
          <div className="pt">Compras</div>
          <div className="ps">Registro de remitos · actualiza stock automáticamente</div>
        </div>
        {tab === 'compras'
          ? <button className="bp" onClick={onNueva}>＋ Nueva compra</button>
          : <button className="bp" onClick={() => setProvModal({})}>＋ Nuevo proveedor</button>
        }
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['compras', '📥 Compras'], ['proveedores', '🏢 Proveedores']].map(([key, label]) => (
          <button key={key} type="button"
            onClick={() => setTab(key)}
            style={{
              padding: '7px 18px', borderRadius: 22, fontSize: 13, fontWeight: 700,
              border: `1.5px solid ${tab === key ? 'var(--nv)' : 'var(--bd2)'}`,
              background: tab === key ? 'var(--nv3)' : 'transparent',
              color: tab === key ? 'var(--nv)' : 'var(--mu)',
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
            }}
          >{label}</button>
        ))}
      </div>

      {/* ── TAB COMPRAS ── */}
      {tab === 'compras' && (
        <>
          <div className="sr" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
            <div className="sc"><div className="sl">Total compras</div><div className="sv">{stats.count}</div></div>
            <div className="sc"><div className="sl">Monto total</div><div className="sv">{fmt(stats.total)}</div></div>
            <div className="sc"><div className="sl">Proveedores</div><div className="sv">{stats.provCount}</div></div>
          </div>

          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <input placeholder="Buscar proveedor o remito..." value={busca} onChange={e => setBusca(e.target.value)} style={{ minWidth: 260 }} />
          </div>

          {loading ? (
            <div className="empty"><div className="emj">⏳</div><p>Cargando...</p></div>
          ) : filtradas.length === 0 ? (
            <div className="empty">
              <div className="emj">📥</div>
              <p>No hay compras registradas.</p>
              <button className="bp" onClick={onNueva}>＋ Registrar compra</button>
            </div>
          ) : (
            <div className="vtable-wrap">
              <table className="vtable">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>N° Remito</th>
                    <th>Productos</th>
                    <th className="num">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.fecha}</td>
                      <td style={{ fontWeight: 700 }}>{c.proveedor || <span style={{ color: 'var(--mu2)' }}>—</span>}</td>
                      <td style={{ fontSize: 13, color: 'var(--mu)' }}>{c.numero_remito || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--mu)' }}>
                        {(c.compra_items || []).length} {(c.compra_items || []).length === 1 ? 'artículo' : 'artículos'}
                      </td>
                      <td className="num" style={{ fontWeight: 800, color: 'var(--nv)' }}>{fmt(c.total)}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="bg2 bsm" onClick={() => setShowDetalle(c)}>Ver</button>
                        <button className="bg2 bsm" onClick={() => onEditar(c)}>✏</button>
                        <button className="bdng bsm" onClick={() => onAnular(c)}>Anular</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TAB PROVEEDORES ── */}
      {tab === 'proveedores' && (
        <>
          {proveedores.length === 0 ? (
            <div className="empty">
              <div className="emj">🏢</div>
              <p>No hay proveedores cargados.</p>
              <button className="bp" onClick={() => setProvModal({})}>＋ Agregar proveedor</button>
            </div>
          ) : (
            <div className="vtable-wrap">
              <table className="vtable">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>CUIT</th>
                    <th>Observaciones</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {proveedores.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>{p.nombre}</td>
                      <td style={{ fontSize: 13, color: 'var(--mu)', fontFamily: 'monospace' }}>{p.cuit || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--mu)' }}>{p.obs || '—'}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="bg2 bsm" onClick={() => setProvModal(p)}>✏ Editar</button>
                        <button className="bdng bsm" onClick={() => handleDeleteProv(p)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal detalle compra */}
      {showDetalle && (
        <div className="ov op" onClick={e => e.target === e.currentTarget && setShowDetalle(null)}>
          <div className="dm" style={{ maxWidth: 500 }}>
            <div className="moh">
              <div className="mot"><div className="mot-icon">📥</div>Detalle de compra</div>
              <button className="xcl" onClick={() => setShowDetalle(null)}>✕</button>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="dm-row"><span className="dm-label">Fecha</span><span className="dm-val">{showDetalle.fecha}</span></div>
              <div className="dm-row"><span className="dm-label">Proveedor</span><span className="dm-val">{showDetalle.proveedor || '—'}</span></div>
              <div className="dm-row"><span className="dm-label">N° Remito</span><span className="dm-val">{showDetalle.numero_remito || '—'}</span></div>
              {showDetalle.obs && <div className="dm-row"><span className="dm-label">Obs.</span><span className="dm-val">{showDetalle.obs}</span></div>}
              <div className="sdv" style={{ marginTop: 14 }}>Artículos</div>
              {(showDetalle.compra_items || []).map((it, i) => (
                <div key={i} className="dm-row">
                  <span className="dm-label">{it.nombre_producto} ×{it.cantidad}</span>
                  <span className="dm-val" style={{ fontWeight: 700 }}>{fmt(it.subtotal)}</span>
                </div>
              ))}
              {(showDetalle.descuento_valor > 0) && (
                <>
                  <div className="sdv" style={{ marginTop: 14 }}>Descuento</div>
                  <div className="dm-row">
                    <span className="dm-label">
                      {showDetalle.descuento_tipo === 'porcentaje' ? `${showDetalle.descuento_valor}%` : 'Monto fijo'}
                    </span>
                    <span className="dm-val" style={{ fontWeight: 700, color: '#e53e3e' }}>
                      −{fmt(showDetalle.descuento_tipo === 'porcentaje'
                        ? (showDetalle.compra_items || []).reduce((s, it) => s + (it.subtotal || 0), 0) * showDetalle.descuento_valor / 100
                        : showDetalle.descuento_valor)}
                    </span>
                  </div>
                </>
              )}
              {(showDetalle.iva > 0 || showDetalle.retenciones > 0 || showDetalle.impuestos > 0 || showDetalle.otros_gastos > 0) && (
                <>
                  <div className="sdv" style={{ marginTop: 14 }}>Impuestos y gastos</div>
                  {showDetalle.iva > 0 && <div className="dm-row"><span className="dm-label">IVA</span><span className="dm-val" style={{ fontWeight: 700 }}>{fmt(showDetalle.iva)}</span></div>}
                  {showDetalle.retenciones > 0 && <div className="dm-row"><span className="dm-label">Retenciones</span><span className="dm-val" style={{ fontWeight: 700 }}>{fmt(showDetalle.retenciones)}</span></div>}
                  {showDetalle.impuestos > 0 && <div className="dm-row"><span className="dm-label">Impuestos</span><span className="dm-val" style={{ fontWeight: 700 }}>{fmt(showDetalle.impuestos)}</span></div>}
                  {showDetalle.otros_gastos > 0 && <div className="dm-row"><span className="dm-label">Otros gastos</span><span className="dm-val" style={{ fontWeight: 700 }}>{fmt(showDetalle.otros_gastos)}</span></div>}
                </>
              )}
              <div className="tb" style={{ marginTop: 14 }}>
                <div className="tr big"><span className="tl">TOTAL</span><span className="tv">{fmt(showDetalle.total)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal proveedor */}
      {provModal !== null && (
        <ProveedorModal
          prov={provModal?.id ? provModal : null}
          onSave={handleSaveProv}
          onClose={() => setProvModal(null)}
        />
      )}
    </div>
  )
}
