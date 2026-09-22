import React, { useState, useEffect } from 'react'
import { fechaHoyAR } from '../utils'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
const hoy = () => fechaHoyAR()

export default function CompraModal({ compra, productos, proveedores = [], metodosPago = [], onSave, onClose, addToast }) {
  const esEdicion = !!compra?.id

  const [proveedor, setProveedor] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [remito, setRemito] = useState('')
  const [metodo, setMetodo] = useState('Efectivo')
  const [obs, setObs] = useState('')
  const [items, setItems] = useState([])
  const [busca, setBusca] = useState('')
  const [iva, setIva] = useState(0)
  const [retenciones, setRetenciones] = useState(0)
  const [impuestos, setImpuestos] = useState(0)
  const [otrosGastos, setOtrosGastos] = useState(0)
  const [descuentoTipo, setDescuentoTipo] = useState('monto')
  const [descuentoValor, setDescuentoValor] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (compra) {
      setProveedor(compra.proveedor || '')
      setFecha(compra.fecha || hoy())
      setRemito(compra.numero_remito || '')
      setMetodo(compra.metodo_pago || 'Efectivo')
      setObs(compra.obs || '')
      setIva(compra.iva || 0)
      setRetenciones(compra.retenciones || 0)
      setImpuestos(compra.impuestos || 0)
      setOtrosGastos(compra.otros_gastos || 0)
      setDescuentoTipo(compra.descuento_tipo || 'monto')
      setDescuentoValor(compra.descuento_valor || 0)
      setItems((compra.compra_items || []).map(it => ({
        producto_id: it.producto_id,
        nombre_producto: it.nombre_producto,
        precio_unitario: it.precio_unitario || 0,
        cantidad: it.cantidad || 1,
        subtotal: it.subtotal || 0,
      })))
    }
  }, [compra])

  const METODOS = metodosPago.length ? metodosPago : ['Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Mercado Pago', 'Otro']

  const prodsFiltrados = productos.filter(p =>
    p.activo !== false && p.tipo === 'simple' &&
    (busca.length === 0 || p.nombre.toLowerCase().includes(busca.toLowerCase()) || (p.codigo || '').toLowerCase().includes(busca.toLowerCase()))
  ).slice(0, 8)

  function agregarProducto(prod) {
    if (items.find(it => it.producto_id === prod.id)) {
      addToast('Ya está en la lista', 'err'); return
    }
    setItems(prev => [...prev, {
      producto_id: prod.id,
      nombre_producto: prod.nombre,
      precio_unitario: prod.precio_costo || 0,
      cantidad: 1,
      subtotal: prod.precio_costo || 0,
    }])
    setBusca('')
  }

  function cambiar(pid, campo, valor) {
    setItems(prev => prev.map(it => {
      if (it.producto_id !== pid) return it
      const upd = { ...it, [campo]: parseFloat(valor) || 0 }
      upd.subtotal = upd.cantidad * upd.precio_unitario
      return upd
    }))
  }

  const subtotalProductos = items.reduce((s, it) => s + it.subtotal, 0)
  const montoDescuento = descuentoTipo === 'porcentaje'
    ? subtotalProductos * (descuentoValor || 0) / 100
    : (descuentoValor || 0)
  const total = subtotalProductos - montoDescuento + (iva || 0) + (retenciones || 0) + (impuestos || 0) + (otrosGastos || 0)

  async function handleGuardar() {
    if (items.length === 0) { addToast('Agregá al menos un producto', 'err'); return }
    setSaving(true)
    try {
      const data = { proveedor, fecha, numero_remito: remito, total, metodo_pago: metodo, obs, iva: iva || 0, retenciones: retenciones || 0, impuestos: impuestos || 0, otros_gastos: otrosGastos || 0, descuento_tipo: descuentoTipo, descuento_valor: descuentoValor || 0 }
      if (esEdicion) data.id = compra.id
      await onSave(data, items, esEdicion ? compra.compra_items : null)
    } catch (e) {
      addToast('Error: ' + e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ov op" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mo" style={{ maxWidth: 800 }}>
        <div className="moh">
          <div className="mot"><div className="mot-icon">📥</div>{esEdicion ? 'Editar compra' : 'Nueva compra'}</div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>

        <div className="sdv">Datos del remito</div>
        <div className="fg">
          <div className="fgg">
            <label>Proveedor</label>
            {proveedores.length > 0 ? (
              <select value={proveedor} onChange={e => setProveedor(e.target.value)}
                style={{ border: '1px solid var(--bd2)', borderRadius: 10, padding: '9px 13px', fontSize: 13, background: 'var(--bg)', color: 'var(--tx)', width: '100%' }}>
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.nombre}>{p.nombre}{p.cuit ? ` — ${p.cuit}` : ''}</option>
                ))}
                <option value="__otro__">Otro (escribir)</option>
              </select>
            ) : (
              <input value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Nombre del proveedor" />
            )}
          </div>

          {/* Si eligieron "Otro" o no hay proveedores, mostrar campo libre */}
          {proveedores.length > 0 && proveedor === '__otro__' && (
            <div className="fgg">
              <label>Nombre del proveedor</label>
              <input
                value={''}
                onChange={e => setProveedor(e.target.value)}
                placeholder="Escribí el nombre..."
                autoFocus
              />
            </div>
          )}

          <div className="fgg">
            <label>N° Remito / Factura</label>
            <input value={remito} onChange={e => setRemito(e.target.value)} placeholder="Ej: 0001-00012345" />
          </div>
          <div className="fgg">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="fgg">
            <label>Método de pago</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="fgg">
            <label>Observaciones</label>
            <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional..." />
          </div>
        </div>

        <div className="sdv">Productos recibidos</div>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar producto simple para agregar..."
            style={{ width: '100%', border: '1px solid var(--bd2)', borderRadius: 10, padding: '10px 14px', fontSize: 14 }}
          />
          {busca && prodsFiltrados.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              background: 'var(--wh)', border: '1px solid var(--bd2)', borderRadius: 10,
              boxShadow: 'var(--sh2)', marginTop: 4, overflow: 'hidden'
            }}>
              {prodsFiltrados.map(p => (
                <div key={p.id}
                  onClick={() => agregarProducto(p)}
                  style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bd)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--nv3)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{p.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--mu)' }}>Stock actual: {p.stock_actual || 0}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--mu)' }}>Costo: {fmt(p.precio_costo)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--mu2)', fontSize: 13 }}>
            Buscá productos para agregar a la compra
          </div>
        ) : (
          <div className="vtable-wrap">
            <table className="vtable">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Cantidad</th>
                  <th className="num">Precio unit. (costo)</th>
                  <th className="num">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.producto_id}>
                    <td style={{ fontWeight: 700 }}>{it.nombre_producto}</td>
                    <td className="num">
                      <input type="number" min="1" step="1" value={it.cantidad}
                        onChange={e => cambiar(it.producto_id, 'cantidad', e.target.value)}
                        style={{ width: 80, textAlign: 'right', border: '1px solid var(--bd2)', borderRadius: 7, padding: '4px 8px', fontSize: 13 }}
                      />
                    </td>
                    <td className="num">
                      <input type="number" min="0" step="0.01" value={it.precio_unitario}
                        onChange={e => cambiar(it.producto_id, 'precio_unitario', e.target.value)}
                        style={{ width: 110, textAlign: 'right', border: '1px solid var(--bd2)', borderRadius: 7, padding: '4px 8px', fontSize: 13 }}
                      />
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>{fmt(it.subtotal)}</td>
                    <td>
                      <button className="bdng" onClick={() => setItems(prev => prev.filter(x => x.producto_id !== it.producto_id))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="sdv" style={{ marginTop: 18 }}>Descuento</div>
        <div className="fg">
          <div className="fgg">
            <label>Tipo de descuento</label>
            <select value={descuentoTipo} onChange={e => setDescuentoTipo(e.target.value)}>
              <option value="monto">Monto fijo ($)</option>
              <option value="porcentaje">Porcentaje (%)</option>
            </select>
          </div>
          <div className="fgg">
            <label>{descuentoTipo === 'porcentaje' ? 'Porcentaje (%)' : 'Monto ($)'}</label>
            <input type="number" min="0" step="0.01" value={descuentoValor || ''} onChange={e => setDescuentoValor(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          {descuentoTipo === 'porcentaje' && descuentoValor > 0 && (
            <div className="fgg" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 13, color: 'var(--mu)', padding: '9px 0' }}>= {fmt(montoDescuento)}</span>
            </div>
          )}
        </div>

        <div className="sdv" style={{ marginTop: 18 }}>Impuestos y otros gastos</div>
        <div className="fg">
          <div className="fgg">
            <label>IVA</label>
            <input type="number" min="0" step="0.01" value={iva || ''} onChange={e => setIva(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <div className="fgg">
            <label>Retenciones</label>
            <input type="number" min="0" step="0.01" value={retenciones || ''} onChange={e => setRetenciones(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <div className="fgg">
            <label>Impuestos</label>
            <input type="number" min="0" step="0.01" value={impuestos || ''} onChange={e => setImpuestos(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <div className="fgg">
            <label>Otros gastos</label>
            <input type="number" min="0" step="0.01" value={otrosGastos || ''} onChange={e => setOtrosGastos(parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
        </div>

        <div className="tb" style={{ marginTop: 16 }}>
          <div className="tr"><span className="tl">Subtotal productos</span><span className="tv">{fmt(subtotalProductos)}</span></div>
          {montoDescuento > 0 && (
            <div className="tr"><span className="tl">Descuento {descuentoTipo === 'porcentaje' ? `(${descuentoValor}%)` : ''}</span><span className="tv" style={{ color: '#e53e3e' }}>−{fmt(montoDescuento)}</span></div>
          )}
          {(iva > 0 || retenciones > 0 || impuestos > 0 || otrosGastos > 0) && <>
            {iva > 0 && <div className="tr"><span className="tl">IVA</span><span className="tv">{fmt(iva)}</span></div>}
            {retenciones > 0 && <div className="tr"><span className="tl">Retenciones</span><span className="tv">{fmt(retenciones)}</span></div>}
            {impuestos > 0 && <div className="tr"><span className="tl">Impuestos</span><span className="tv">{fmt(impuestos)}</span></div>}
            {otrosGastos > 0 && <div className="tr"><span className="tl">Otros gastos</span><span className="tv">{fmt(otrosGastos)}</span></div>}
          </>}
          <div className="tr big"><span className="tl">TOTAL COMPRA</span><span className="tv">{fmt(total)}</span></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="bg2" onClick={onClose}>Cancelar</button>
          <button className="bp" onClick={handleGuardar} disabled={saving || items.length === 0}>
            {saving ? 'Guardando...' : esEdicion ? '💾 Guardar cambios' : '✓ Registrar compra'}
          </button>
        </div>
      </div>
    </div>
  )
}
