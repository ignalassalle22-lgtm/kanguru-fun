import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { fechaHoyAR, fechaHoyAR as _f, imprimirTicketBrowser, fmt as fmtUtil } from '../utils'
import { useCaja } from '../hooks/useCaja'
import { useVentas } from '../hooks/useVentas'
import { useProductos } from '../hooks/useProductos'
import { useConfig } from '../hooks/useConfig'
import { useEmpleados } from '../hooks/useEmpleados'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
const fmtT = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-AR')

function imprimirVenta({ numero, fecha, hora, cliente, items, subtotal, descuento, total, metodoPago, obs }) {
  fetch('http://127.0.0.1:5001/print/venta_caja', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    targetAddressSpace: 'loopback',
    body: JSON.stringify({
      numero, fecha, hora, cliente,
      venta_items: items.map(it => ({ nombre_producto: it.nombre_producto, cantidad: it.cantidad, subtotal: it.subtotal })),
      subtotal, descuento, total, metodo_pago: metodoPago, obs,
    }),
  }).then(r => { if (!r.ok) throw new Error('servidor respondió error') }).catch((err) => {
    console.error('[PRINT] Error conectando al servidor de impresión:', err.message || err)
    const sep = '--------------------------------'
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title></title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:9px;width:74mm}
h1{font-size:11px;font-weight:bold;text-align:center;margin-bottom:2px}
pre{font-size:8px;margin:2px 0}table{width:100%;border-collapse:collapse}
td{padding:1px 0;font-size:9px}td.r{text-align:right}
.big td{font-size:10px;font-weight:bold}.foot{text-align:center;font-size:8px;margin-top:4px}
</style></head><body>
<h1>KANGOO CUMPLES</h1>
<pre>${sep}</pre>
<table>
<tr><td>N°</td><td class="r"><b>${numero}</b></td></tr>
<tr><td>Fecha</td><td class="r">${fecha} ${hora}</td></tr>
${cliente ? `<tr><td>Cliente</td><td class="r">${cliente}</td></tr>` : ''}
<tr><td>Pago</td><td class="r">${metodoPago}</td></tr>
</table>
<pre>${sep}</pre>
<table>${items.map(it => `<tr><td>${it.nombre_producto} x${it.cantidad}</td><td class="r">${fmtT(it.subtotal)}</td></tr>`).join('')}</table>
<pre>${sep}</pre>
<table>
${descuento > 0 ? `<tr><td>Subtotal</td><td class="r">${fmtT(subtotal)}</td></tr><tr><td>Descuento</td><td class="r">-${fmtT(descuento)}</td></tr>` : ''}
<tr class="big"><td>TOTAL</td><td class="r">${fmtT(total)}</td></tr>
</table>
<div class="foot">Gracias por tu visita!</div>
</body></html>`
    imprimirTicketBrowser(html)
  })
}

const CAT_COLORS = [
  { bg: '#fff0f0', border: '#f87171' },
  { bg: '#fff7ed', border: '#fb923c' },
  { bg: '#fefce8', border: '#facc15' },
  { bg: '#f0fdf4', border: '#4ade80' },
  { bg: '#eff6ff', border: '#60a5fa' },
  { bg: '#fdf4ff', border: '#c084fc' },
  { bg: '#fff1f2', border: '#fb7185' },
  { bg: '#ecfdf5', border: '#34d399' },
  { bg: '#f0f9ff', border: '#38bdf8' },
  { bg: '#faf5ff', border: '#a78bfa' },
  { bg: '#fefce8', border: '#a3e635' },
  { bg: '#fff7ed', border: '#f97316' },
]

function parsearMetodos(metodo_pago, totalVenta) {
  if (!metodo_pago) return { Otro: totalVenta }
  if (metodo_pago.includes('$')) {
    const result = {}
    metodo_pago.split(' + ').forEach(parte => {
      const idx = parte.lastIndexOf('$')
      if (idx === -1) return
      const nombre = parte.slice(0, idx).trim()
      const monto = parseFloat(parte.slice(idx + 1).replace(/\./g, '').replace(',', '.')) || 0
      if (nombre) result[nombre] = (result[nombre] || 0) + monto
    })
    return result
  }
  return { [metodo_pago]: totalVenta }
}

// ── Modal opciones producto variable ─────────────────────────────────────────
function ModalVariableOpciones({ producto, productos, onConfirmar, onClose }) {
  const componentes = producto.componentes || []
  // grupos con elección: los que tienen categoria_id y tipo !== 'fijo'
  const grupos = componentes.filter(g => g.tipo !== 'fijo' && g.categoria_id)
  // items fijos: siempre incluidos
  const fijos = componentes.filter(g => g.tipo === 'fijo' && g.nombre)

  const [selecciones, setSelecciones] = useState({}) // { grupoNombre: productoId }

  const todosSeleccionados = grupos.every(g => selecciones[g.nombre])
  const puedeConfirmar = todosSeleccionados // fijos son automáticos, no requieren acción

  function seleccionar(grupoNombre, prodId) {
    setSelecciones(prev => ({ ...prev, [grupoNombre]: prodId }))
  }

  function confirmar() {
    const partesOpciones = grupos.map(g => {
      const p = productos.find(x => x.id === selecciones[g.nombre])
      return `${g.nombre}: ${p ? p.nombre : '?'}`
    })
    const partesFijos = fijos.map(f => f.nombre)
    const texto = [...partesOpciones, ...partesFijos].join(' · ')

    // Armar la lista de componentes reales para descontar stock
    const componentesVar = [
      // Productos elegidos por el empleado (uno por grupo)
      ...grupos.map(g => {
        const p = productos.find(x => x.id === selecciones[g.nombre])
        return p ? { tipo: 'opcion', producto_id: p.id, nombre: p.nombre, cantidad: 1 } : null
      }).filter(Boolean),
      // Productos fijos (siempre incluidos, con su cantidad)
      ...fijos.filter(f => f.producto_id).map(f => ({
        tipo: 'fijo', producto_id: f.producto_id, nombre: f.nombre, cantidad: f.cantidad || 1,
      })),
    ]

    onConfirmar(producto, texto, selecciones, componentesVar)
  }

  return (
    <div className="ov op" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mo" style={{ maxWidth: 480 }}>
        <div className="moh">
          <div className="mot">
            <div className="mot-icon">🎛️</div>
            {producto.nombre}
          </div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>

        {grupos.length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 20 }}>
            Elegí una opción por grupo para agregar al ticket.
          </p>
        )}

        {/* Grupos con elección */}
        {grupos.map(g => {
          const opcs = productos.filter(p => p.categoria_id === g.categoria_id && p.activo !== false)
          return (
            <div key={g.nombre} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--mu)', marginBottom: 8 }}>
                {g.nombre}
              </div>
              {opcs.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--rd)', fontStyle: 'italic' }}>
                  No hay productos activos en esta categoría
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {opcs.map(p => {
                    const selected = selecciones[g.nombre] === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => seleccionar(g.nombre, p.id)}
                        style={{
                          padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                          cursor: 'pointer', border: `2px solid ${selected ? 'var(--or)' : 'var(--bd2)'}`,
                          background: selected ? 'var(--orb, #fff3e0)' : 'var(--wh)',
                          color: selected ? 'var(--or)' : 'var(--tx)',
                          transition: 'all .1s',
                          fontFamily: 'Nunito, sans-serif',
                        }}
                      >
                        {selected ? '✓ ' : ''}{p.nombre}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Items fijos */}
        {fijos.length > 0 && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--mu)', marginBottom: 8 }}>
              Incluido siempre
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {fijos.map(f => (
                <span key={f.nombre} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'var(--gnb, #f0fdf4)', color: 'var(--gn)', border: '1.5px solid var(--gn)',
                }}>
                  ✓ {f.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--bd)' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gn)' }}>
            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(producto.precio_venta || 0)}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bg2" onClick={onClose}>Cancelar</button>
            <button
              className="bp"
              onClick={confirmar}
              disabled={!puedeConfirmar}
              style={{ opacity: puedeConfirmar ? 1 : 0.4 }}
            >
              Agregar al ticket →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Selector de caja ──────────────────────────────────────────────────────────
function SelectorCaja({ cajasAbiertas, onSelect }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--nv)', fontFamily: 'Nunito, sans-serif' }}>Sistema de Ventas</div>
        <div style={{ fontSize: 15, color: 'var(--mu)', marginTop: 8 }}>Seleccioná la caja en la que vas a trabajar</div>
      </div>

      {cajasAbiertas.length === 0 ? (
        <div style={{
          background: 'var(--wh)', borderRadius: 16, padding: '32px 40px', textAlign: 'center',
          border: '1px solid var(--bd)', boxShadow: 'var(--sh)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--nv)', marginBottom: 8 }}>No hay cajas abiertas</div>
          <div style={{ fontSize: 14, color: 'var(--mu)' }}>Primero abrí una caja desde el módulo Caja del sistema.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800 }}>
          {cajasAbiertas.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              style={{
                background: 'var(--wh)', border: '2px solid var(--bd)',
                borderRadius: 16, padding: '28px 36px', cursor: 'pointer',
                transition: 'all .15s', textAlign: 'center', minWidth: 200,
                boxShadow: 'var(--sh)',
                fontFamily: 'Nunito, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--or)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--sh2)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--sh)' }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--nv)' }}>{c.nombre || 'Caja'}</div>
              {c.turno && (
                <div style={{ fontSize: 13, background: 'var(--nv3)', color: 'var(--nv)', padding: '3px 12px', borderRadius: 20, fontWeight: 700, display: 'inline-block', marginTop: 6 }}>
                  {c.turno}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 10 }}>
                Abierta desde {c.hora_apertura} hs
              </div>
              <div style={{ fontSize: 12, color: 'var(--mu)' }}>
                Saldo inicial {fmt(c.saldo_inicial)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Interfaz POS ─────────────────────────────────────────────────────────────
function POSInterface({ caja, ventas, saveVenta, updateStock, productos, categorias, config, empleados, addToast }) {
  const METODOS = config.mets_caja?.length ? config.mets_caja : ['Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Mercado Pago', 'Otro']

  // Ticket state
  const [items, setItems] = useState([])
  const [busca, setBusca] = useState('')
  const [cliente, setCliente] = useState('')
  const [empleadoId, setEmpleadoId] = useState('')
  const [metodo, setMetodo] = useState('Efectivo')
  const [pagaCon, setPagaCon] = useState('')
  const [descuento, setDescuento] = useState('')
  const [descuentoTipo, setDescuentoTipo] = useState('monto')
  const [obs, setObs] = useState('')
  const [catSeleccionada, setCatSeleccionada] = useState(null)
  const [saving, setSaving] = useState(false)
  const [ultimaVenta, setUltimaVenta] = useState(null)
  const [multiMet, setMultiMet] = useState(false)
  const [metsPagados, setMetsPagados] = useState([{ id: 1, met: 'Efectivo', monto: '' }])
  const buscaRef = useRef()
  const [varModal, setVarModal] = useState(null) // producto variable pendiente de opciones

  const empleadosActivos = empleados.filter(e => e.activo !== false)

  // Ventas de esta caja hoy
  const ventasCaja = useMemo(() =>
    ventas.filter(v => v.caja_id === caja.id && v.estado !== 'anulada'),
    [ventas, caja.id]
  )

  const desglose = useMemo(() => {
    const map = {}
    ventasCaja.forEach(v => {
      const metodos = parsearMetodos(v.metodo_pago, v.total || 0)
      Object.entries(metodos).forEach(([met, monto]) => {
        map[met] = (map[met] || 0) + monto
      })
    })
    return map
  }, [ventasCaja])

  const totalVentas = ventasCaja.reduce((s, v) => s + (v.total || 0), 0)
  const totalEfectivo = desglose['Efectivo'] || 0
  const efectivoEsperado = (caja.saldo_inicial || 0) + totalEfectivo

  // Categorías visibles (excluir "Stock interno")
  const categoriasVisibles = useMemo(() =>
    categorias.filter(c => c.nombre.toLowerCase() !== 'stock interno'),
  [categorias])

  // Productos mostrados: con categoría → todos de esa cat + filtro busca; sin cat + busca → búsqueda global
  const prodsMostrados = useMemo(() => {
    let lista = productos.filter(p => p.activo !== false)
    if (catSeleccionada) lista = lista.filter(p => p.categoria_id === catSeleccionada.id)
    if (busca) lista = lista.filter(p =>
      p.nombre.toLowerCase().includes(busca.toLowerCase()) ||
      (p.codigo || '').toLowerCase().includes(busca.toLowerCase())
    )
    return catSeleccionada ? lista : (busca ? lista.slice(0, 8) : [])
  }, [busca, productos, catSeleccionada])

  function catUnidades(catId) {
    const ids = new Set(productos.filter(p => p.categoria_id === catId).map(p => p.id))
    return items.filter(it => ids.has(it.producto_id)).reduce((s, it) => s + it.cantidad, 0)
  }

  function agregarProducto(prod) {
    if (prod.tipo === 'variable') {
      setVarModal(prod)
      return
    }
    const key = String(prod.id)
    const existe = items.find(it => it._key === key)
    if (existe) {
      setItems(prev => prev.map(it => it._key === key
        ? { ...it, cantidad: it.cantidad + 1, subtotal: (it.cantidad + 1) * it.precio_unitario }
        : it
      ))
    } else {
      setItems(prev => [...prev, {
        _key: key,
        producto_id: prod.id,
        nombre_producto: prod.nombre,
        precio_unitario: prod.precio_venta || 0,
        cantidad: 1,
        subtotal: prod.precio_venta || 0,
        componentes: prod.componentes || [],
        maneja_stock: prod.maneja_stock ?? true,
        _stockActual: prod.stock_actual,
        _tipo: prod.tipo,
      }])
    }
    if (!catSeleccionada) setBusca('')
    buscaRef.current?.focus()
  }

  function confirmarVariable(prod, opcionesTexto, opcionesDetalle, componentesVar) {
    const key = 'v_' + Date.now()
    setItems(prev => [...prev, {
      _key: key,
      producto_id: prod.id,
      nombre_producto: prod.nombre,
      precio_unitario: prod.precio_venta || 0,
      cantidad: 1,
      subtotal: prod.precio_venta || 0,
      componentes: [],
      maneja_stock: false,
      _stockActual: null,
      _tipo: 'variable',
      _opciones: opcionesTexto,
      _componentesVar: componentesVar || [],
    }])
    setVarModal(null)
    if (!catSeleccionada) setBusca('')
    buscaRef.current?.focus()
  }

  function cambiarCantidad(key, valor) {
    const qty = Math.max(1, Math.round(parseFloat(valor) || 1))
    setItems(prev => prev.map(it => it._key === key
      ? { ...it, cantidad: qty, subtotal: qty * it.precio_unitario }
      : it
    ))
  }

  function cambiarPrecio(key, valor) {
    const p = parseFloat(valor) || 0
    setItems(prev => prev.map(it => it._key === key
      ? { ...it, precio_unitario: p, subtotal: it.cantidad * p }
      : it
    ))
  }

  function quitarItem(key) {
    setItems(prev => prev.filter(it => it._key !== key))
  }

  function limpiarTicket() {
    setItems([]); setCliente(''); setPagaCon(''); setDescuento(''); setObs('')
    setMultiMet(false); setMetsPagados([{ id: 1, met: 'Efectivo', monto: '' }])
    setTimeout(() => buscaRef.current?.focus(), 100)
  }

  function toggleMultiMet() {
    if (!multiMet) {
      setMetsPagados([{ id: 1, met: metodo, monto: '' }])
      setMultiMet(true)
    } else {
      setMultiMet(false)
      setMetsPagados([{ id: 1, met: 'Efectivo', monto: '' }])
      setPagaCon('')
    }
  }

  function addMetPagado() {
    setMetsPagados(prev => [...prev, { id: Date.now(), met: METODOS[0], monto: '' }])
  }

  function removeMetPagado(id) {
    setMetsPagados(prev => prev.filter(m => m.id !== id))
  }

  function updateMetPagado(id, field, val) {
    setMetsPagados(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m))
  }

  const totalCubierto = multiMet ? metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0) : 0

  const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
  const descuentoNum = descuentoTipo === 'pct'
    ? subtotal * (parseFloat(descuento) || 0) / 100
    : parseFloat(descuento) || 0
  const total = Math.max(0, subtotal - descuentoNum)
  const pagaConNum = parseFloat(pagaCon) || 0
  const vuelto = metodo === 'Efectivo' && pagaConNum > 0 ? pagaConNum - total : 0

  async function handleCobrar() {
    if (items.length === 0) { addToast('Agregá al menos un producto', 'err'); return }
    if (descuentoNum > subtotal) { addToast(`El descuento (${fmt(descuentoNum)}) no puede superar el subtotal (${fmt(subtotal)})`, 'err'); return }
    if (multiMet) {
      if (metsPagados.some(m => !m.monto || parseFloat(m.monto) <= 0)) {
        addToast('Completá el monto de cada método de pago', 'err'); return
      }
      if (Math.abs(totalCubierto - total) > 1) {
        addToast(`El total cubierto (${fmt(totalCubierto)}) no coincide con el total (${fmt(total)})`, 'err'); return
      }
    }
    const sinStock = items.filter(it => it._tipo === 'simple' && it.maneja_stock !== false && (it._stockActual || 0) < it.cantidad)
    if (sinStock.length > 0) {
      addToast('Stock insuficiente: ' + sinStock.map(it => it.nombre_producto).join(', '), 'err')
      return
    }
    const metodoPagoFinal = multiMet
      ? metsPagados.map(m => `${m.met} $${Math.round(parseFloat(m.monto) || 0).toLocaleString('es-AR')}`).join(' + ')
      : metodo
    setSaving(true)
    try {
      const fecha = fechaHoyAR()
      const hora = new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false })
      // Para items variables: incluir opciones en el nombre al persistir e imprimir
      const itemsConOpciones = items.map(it => it._opciones
        ? { ...it, nombre_producto: `${it.nombre_producto} (${it._opciones})` }
        : it
      )
      const ventaGuardada = await saveVenta(
        {
          fecha, hora, cliente,
          subtotal, descuento: descuentoNum, total,
          metodo_pago: metodoPagoFinal,
          caja_id: caja.id,
          empleado_id: empleadoId ? Number(empleadoId) : null,
          obs,
          estado: 'completada',
        },
        itemsConOpciones,
        updateStock
      )
      // Descontar stock de componentes de productos variables (se manejan aparte
      // porque sus componentes vienen de _componentesVar, no de item.componentes)
      for (const it of items) {
        if (it._tipo === 'variable' && it._componentesVar?.length > 0) {
          for (const comp of it._componentesVar) {
            if (!comp.producto_id) continue
            await updateStock(comp.producto_id, -(comp.cantidad * it.cantidad))
            const prodComp = productos.find(p => p.id === comp.producto_id)
            if (prodComp?.tipo === 'compuesto' && prodComp.componentes?.length > 0) {
              for (const sub of prodComp.componentes) {
                if (sub.producto_id) {
                  await updateStock(sub.producto_id, -(sub.cantidad * comp.cantidad * it.cantidad))
                }
              }
            }
          }
        }
      }

      setUltimaVenta({ ...ventaGuardada, venta_items: itemsConOpciones })
      addToast('Venta registrada correctamente')
      imprimirVenta({
        numero: ventaGuardada.numero,
        fecha,
        hora,
        cliente,
        items: itemsConOpciones,
        subtotal,
        descuento: descuentoNum,
        total,
        metodoPago: metodoPagoFinal,
        obs,
      })
      limpiarTicket()
    } catch (e) {
      addToast('Error: ' + e.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        background: 'var(--nv)', borderBottom: '3px solid var(--or)',
        padding: '0 24px', height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'Nunito, sans-serif' }}>
            🏪 Sistema de Ventas
          </span>
          <span style={{ background: 'var(--or)', color: '#fff', fontSize: 13, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>
            {caja.nombre || 'Caja'}{caja.turno ? ` · ${caja.turno}` : ''}
          </span>
        </div>
        <button
          onClick={() => window.close()}
          style={{
            background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          ✕ Salir
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', flex: 1, gap: 0, minHeight: 0 }}>

        {/* Panel izquierdo: ticket */}
        <div style={{ padding: 24, overflowY: 'auto', borderRight: '1px solid var(--bd)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Nuevo ticket</div>

          {/* Selector de productos: categorías o vista dentro de categoría */}
          {!catSeleccionada ? (
            <>
              {/* Buscador rápido */}
              <input
                ref={buscaRef}
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Búsqueda rápida de producto..."
                autoFocus
                style={{
                  width: '100%', border: '2px solid var(--bd2)', borderRadius: 10,
                  padding: '11px 16px', fontSize: 15, marginBottom: 16, outline: 'none',
                  fontFamily: 'Nunito Sans, sans-serif',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--or)'}
                onBlur={e => e.target.style.borderColor = 'var(--bd2)'}
              />

              {/* Resultados de búsqueda rápida */}
              {busca && prodsMostrados.length > 0 && (
                <div style={{ background: 'var(--wh)', border: '1px solid var(--bd2)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                  {prodsMostrados.map(p => (
                    <div key={p.id} onClick={() => agregarProducto(p)}
                      style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bd)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--nv3)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--mu)' }}>
                          {p.tipo === 'simple' ? `Stock: ${p.stock_actual || 0}` : p.tipo === 'variable' ? '🎛️ Variable' : 'Compuesto'}
                          {p.codigo ? ` · ${p.codigo}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gn)' }}>{fmt(p.precio_venta)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Grid de tiles de categoría */}
              {!busca && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {categoriasVisibles.map((cat, i) => {
                    const color = CAT_COLORS[i % CAT_COLORS.length]
                    const unidades = catUnidades(cat.id)
                    return (
                      <div key={cat.id} onClick={() => { setCatSeleccionada(cat); setBusca('') }}
                        style={{
                          background: color.bg, border: `3px solid ${color.border}`,
                          borderRadius: 10, padding: '18px 8px 16px', cursor: 'pointer',
                          textAlign: 'center', transition: 'transform .1s, box-shadow .1s',
                          userSelect: 'none', minHeight: 110,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.14)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#222', lineHeight: 1.25, marginBottom: 8 }}>{cat.nombre}</div>
                        <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: unidades > 0 ? color.border : '#bbb' }}>{unidades}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Vista de productos de una categoría */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <button className="bg2 bsm" onClick={() => { setCatSeleccionada(null); setBusca('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  ← Categorías
                </button>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--nv)' }}>{catSeleccionada.nombre}</span>
                <input
                  ref={buscaRef}
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Filtrar..."
                  autoFocus
                  style={{ border: '1px solid var(--bd2)', borderRadius: 8, padding: '6px 11px', fontSize: 13, marginLeft: 'auto', width: 160 }}
                />
              </div>

              {prodsMostrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--mu2)', fontSize: 14 }}>
                  No hay productos en esta categoría
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
                  {prodsMostrados.map(p => {
                    const enTicket = p.tipo !== 'variable' ? items.find(it => it.producto_id === p.id) : null
                    const instanciasVar = p.tipo === 'variable' ? items.filter(it => it.producto_id === p.id) : []
                    const enTicketVar = instanciasVar.length > 0
                    return (
                      <div key={p.id} onClick={() => agregarProducto(p)}
                        style={{
                          background: (enTicket || enTicketVar) ? 'var(--nv3)' : 'var(--wh)',
                          border: `1.5px solid ${(enTicket || enTicketVar) ? 'var(--nv)' : 'var(--bd2)'}`,
                          borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', gap: 3,
                          transition: 'all .1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--nv3)'}
                        onMouseLeave={e => e.currentTarget.style.background = (enTicket || enTicketVar) ? 'var(--nv3)' : 'var(--wh)'}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{p.nombre}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 12, color: 'var(--mu)' }}>
                            {p.tipo === 'simple' && p.maneja_stock !== false ? `Stock: ${p.stock_actual || 0}` : p.tipo === 'variable' ? '🎛️ Variable' : ''}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gn)' }}>{fmt(p.precio_venta)}</div>
                        </div>
                        {enTicket && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nv)', marginTop: 2 }}>
                            ✓ En ticket: ×{enTicket.cantidad}
                          </div>
                        )}
                        {enTicketVar && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--or)', marginTop: 2 }}>
                            + {instanciasVar.length} en ticket · click para agregar otro
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Items del ticket */}
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mu2)', fontSize: 15 }}>
              Buscá un producto para agregar al ticket
            </div>
          ) : (
            <div className="vtable-wrap">
              <table className="vtable">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="num" style={{ width: 80 }}>Cant.</th>
                    <th className="num" style={{ width: 130 }}>✏ Precio unit.</th>
                    <th className="num" style={{ width: 110 }}>Subtotal</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it._key}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{it.nombre_producto}</div>
                        {it._opciones && (
                          <div style={{ fontSize: 11, color: 'var(--or)', marginTop: 2, fontWeight: 600 }}>↳ {it._opciones}</div>
                        )}
                        {it._tipo === 'simple' && it.maneja_stock !== false && (
                          <div style={{ fontSize: 11, color: (it._stockActual || 0) < it.cantidad ? 'var(--am)' : 'var(--mu)' }}>
                            Stock: {it._stockActual || 0}{(it._stockActual || 0) < it.cantidad ? ' ⚠' : ''}
                          </div>
                        )}
                      </td>
                      <td className="num">
                        <input type="number" min="1" step="1" value={it.cantidad}
                          onChange={e => cambiarCantidad(it._key, e.target.value)}
                          style={{ width: 70, textAlign: 'right', border: '1px solid var(--bd2)', borderRadius: 7, padding: '4px 8px', fontSize: 13 }}
                        />
                      </td>
                      <td className="num">
                        <input type="number" min="0" step="0.01" value={it.precio_unitario}
                          onChange={e => cambiarPrecio(it._key, e.target.value)}
                          style={{ width: 110, textAlign: 'right', border: '1px solid var(--nv2)', borderRadius: 7, padding: '4px 8px', fontSize: 13, background: 'var(--nv3)' }}
                        />
                      </td>
                      <td className="num" style={{ fontWeight: 700 }}>{fmt(it.subtotal)}</td>
                      <td>
                        <button className="bdng" style={{ padding: '3px 8px' }} onClick={() => quitarItem(it._key)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Datos del cliente y empleado */}
          {items.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div className="fgg">
                <label>Cliente (opcional)</label>
                <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre o número" />
              </div>
              {empleadosActivos.length > 0 && (
                <div className="fgg">
                  <label>Empleado</label>
                  <select value={empleadoId} onChange={e => setEmpleadoId(e.target.value)}
                    style={{ border: '1px solid var(--bd2)', borderRadius: 10, padding: '9px 13px', fontSize: 13, background: 'var(--bg)', color: 'var(--tx)', width: '100%' }}>
                    <option value="">Sin asignar</option>
                    {empleadosActivos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              )}
              <div className="fgg">
                <label>Observaciones</label>
                <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional..." />
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho: cobro + resumen de caja */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--wh)', borderLeft: '1px solid var(--bd)' }}>

          {/* Cobro */}
          <div style={{ padding: 20, borderBottom: '1px solid var(--bd)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Cobro</div>

            {/* Descuento */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {['monto', 'pct'].map(t => (
                <button key={t} type="button"
                  className={`rp${descuentoTipo === t ? ' spaid' : ''}`}
                  onClick={() => { setDescuentoTipo(t); setDescuento('') }}
                  style={{ flex: 1, textAlign: 'center', padding: '6px 8px', fontSize: 12 }}
                >
                  {t === 'monto' ? '$ Descuento' : '% Descuento'}
                </button>
              ))}
            </div>
            <input type="number" min="0" value={descuento} onChange={e => setDescuento(e.target.value)}
              placeholder="0" style={{ width: '100%', border: '1px solid var(--bd2)', borderRadius: 8, padding: '7px 12px', fontSize: 13, marginBottom: 12 }} />

            {/* Totales */}
            <div className="tb" style={{ marginBottom: 14 }}>
              <div className="tr"><span className="tl">Subtotal</span><span className="tv">{fmt(subtotal)}</span></div>
              {descuentoNum > 0 && <div className="tr"><span className="tl">Descuento</span><span className="tv" style={{ color: '#ff9f7a' }}>-{fmt(descuentoNum)}</span></div>}
              <hr className="tsep" />
              <div className="tr big"><span className="tl">TOTAL</span><span className="tv">{fmt(total)}</span></div>
            </div>

            {/* Métodos de pago */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Método de pago</span>
              <button type="button" onClick={toggleMultiMet}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  border: `1.5px solid ${multiMet ? 'var(--nv)' : 'var(--bd2)'}`,
                  background: multiMet ? 'var(--nv3)' : 'transparent',
                  color: multiMet ? 'var(--nv)' : 'var(--mu)',
                  cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                }}
              >{multiMet ? '✓ Múltiple' : '+ Múltiple'}</button>
            </div>

            {!multiMet ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {METODOS.map(m => (
                    <button key={m} type="button"
                      className={`rp ${metodo === m ? 'spaid' : ''}`}
                      onClick={() => { setMetodo(m); setPagaCon('') }}
                      style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13 }}
                    >{m}</button>
                  ))}
                </div>
                {metodo === 'Efectivo' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--mu)', display: 'block', marginBottom: 4 }}>¿Con cuánto paga?</label>
                    <input type="number" min="0" value={pagaCon} onChange={e => setPagaCon(e.target.value)}
                      placeholder={fmt(total)}
                      style={{ width: '100%', border: '1px solid var(--bd2)', borderRadius: 8, padding: '8px 12px', fontSize: 14 }} />
                    {pagaConNum > 0 && (
                      <div style={{
                        marginTop: 8, padding: '8px 12px', borderRadius: 8, textAlign: 'center',
                        background: vuelto >= 0 ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                        border: `1.5px solid ${vuelto >= 0 ? 'var(--gn)' : 'var(--rd)'}`,
                        fontWeight: 800, fontSize: 16,
                        color: vuelto >= 0 ? 'var(--gn)' : 'var(--rd)',
                      }}>
                        {vuelto >= 0 ? `Vuelto: ${fmt(vuelto)}` : `Falta: ${fmt(Math.abs(vuelto))}`}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {metsPagados.map(mp => (
                    <div key={mp.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select value={mp.met} onChange={e => updateMetPagado(mp.id, 'met', e.target.value)}
                        style={{ flex: 1, border: '1px solid var(--bd2)', borderRadius: 8, padding: '7px 8px', fontSize: 12, background: 'var(--bg)', color: 'var(--tx)' }}>
                        {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <input type="number" min="0" value={mp.monto}
                        onChange={e => updateMetPagado(mp.id, 'monto', e.target.value)}
                        placeholder="Monto $"
                        style={{ width: 100, border: '1px solid var(--bd2)', borderRadius: 8, padding: '7px 8px', fontSize: 13, textAlign: 'right' }} />
                      {metsPagados.length > 1 && (
                        <button className="bdng" style={{ padding: '5px 8px', flexShrink: 0 }} onClick={() => removeMetPagado(mp.id)}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="bg2 bsm" onClick={addMetPagado} style={{ marginBottom: 8 }}>
                  + Agregar método
                </button>
                {totalCubierto > 0 && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8, textAlign: 'center',
                    background: Math.abs(totalCubierto - total) <= 1 ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                    border: `1.5px solid ${Math.abs(totalCubierto - total) <= 1 ? 'var(--gn)' : 'var(--rd)'}`,
                    fontWeight: 800, fontSize: 14,
                    color: Math.abs(totalCubierto - total) <= 1 ? 'var(--gn)' : 'var(--rd)',
                  }}>
                    {Math.abs(totalCubierto - total) <= 1
                      ? `✓ Total cubierto: ${fmt(totalCubierto)}`
                      : totalCubierto < total
                        ? `Falta: ${fmt(total - totalCubierto)}`
                        : `Excede: ${fmt(totalCubierto - total)}`}
                  </div>
                )}
              </div>
            )}

            <button
              className="bp"
              onClick={handleCobrar}
              disabled={saving || items.length === 0}
              style={{ width: '100%', padding: '14px', fontSize: 16, marginBottom: 8 }}
            >
              {saving ? 'Registrando...' : `✓ Cobrar ${total > 0 ? fmt(total) : ''}`}
            </button>
            {items.length > 0 && (
              <button className="bg2" onClick={limpiarTicket} style={{ width: '100%', fontSize: 13 }}>
                Limpiar ticket
              </button>
            )}
          </div>

          {/* Resumen de la caja */}
          <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
              Resumen de caja · {caja.fecha}
            </div>

            <div className="li"><span className="lin">Tickets registrados</span><span className="lis" style={{ fontWeight: 700 }}>{ventasCaja.length}</span></div>
            <div className="li"><span className="lin">Total facturado</span><span className="lip">{fmt(totalVentas)}</span></div>
            <div className="li"><span className="lin">Efectivo esperado</span><span className="lip">{fmt(efectivoEsperado)}</span></div>

            {Object.keys(desglose).length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 10 }}>
                  Por método de pago
                </div>
                {Object.entries(desglose).map(([met, monto]) => (
                  <div key={met} className="li">
                    <span className="lin">{met}</span>
                    <span className="lip">{fmt(monto)}</span>
                  </div>
                ))}
              </>
            )}

            {/* Últimos tickets */}
            {ventasCaja.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 10 }}>
                  Últimos tickets
                </div>
                {[...ventasCaja].slice(0, 8).map(v => (
                  <div key={v.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 0', borderBottom: '1px solid var(--bd)', fontSize: 13,
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--nv)', fontFamily: 'Nunito' }}>{v.numero}</span>
                      <span style={{ color: 'var(--mu)', marginLeft: 8, fontSize: 12 }}>{v.hora}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--gn)' }}>{fmt(v.total)}</span>
                  </div>
                ))}
              </>
            )}

            {/* Última venta registrada */}
            {ultimaVenta && (
              <div style={{ marginTop: 16, background: 'var(--gnb)', border: '1px solid var(--gn)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gn)', marginBottom: 6 }}>Última venta registrada</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{ultimaVenta.numero} · {fmt(ultimaVenta.total)}</div>
                <div style={{ fontSize: 12, color: 'var(--mu)' }}>{ultimaVenta.metodo_pago}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal opciones variable */}
      {varModal && (
        <ModalVariableOpciones
          producto={varModal}
          productos={productos}
          onConfirmar={confirmarVariable}
          onClose={() => setVarModal(null)}
        />
      )}

      {/* Toasts */}
      <POSToasts />
    </div>
  )
}

function POSToasts() { return null } // manejado por el padre via addToast

// ── App POS (raíz de la pestaña) ─────────────────────────────────────────────
export default function POS() {
  const [usuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kf_usuario')) || null } catch { return null }
  })
  const [cajaSeleccionada, setCajaSeleccionada] = useState(null)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'ok') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const { cajasAbiertas } = useCaja()
  const { ventas, saveVenta } = useVentas()
  const { productos, categorias, updateStock } = useProductos()
  const { config } = useConfig()
  const { empleados } = useEmpleados()

  if (!usuario) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ background: 'var(--wh)', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: 'var(--sh2)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--nv)' }}>Sesión no iniciada</div>
          <div style={{ fontSize: 14, color: 'var(--mu)', marginTop: 8 }}>Iniciá sesión en el sistema principal primero.</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {!cajaSeleccionada
        ? <SelectorCaja cajasAbiertas={cajasAbiertas} onSelect={setCajaSeleccionada} />
        : <POSInterface
            caja={cajaSeleccionada}
            ventas={ventas}
            saveVenta={saveVenta}
            updateStock={updateStock}
            productos={productos}
            categorias={categorias}
            config={config}
            empleados={empleados}
            addToast={addToast}
          />
      }
      <div id="toast-cont">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </>
  )
}
