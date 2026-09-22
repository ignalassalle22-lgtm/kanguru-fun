import React, { useState, useCallback, useEffect } from 'react'
import { supabase } from './supabase'
import { fechaHoyAR } from './utils'

function imprimirTicketEvento(ev, config) {
  const items = []
  const pChi = ev.precioChico != null ? ev.precioChico : (config.pChico || 0)
  const pAdu = ev.precioAdulto != null ? ev.precioAdulto : (config.pAdulto || 0)
  if (ev.chi > 0) items.push({ n: `Chicos (${ev.chi})`, qty: ev.chi, total: ev.chi * pChi })
  if (ev.adu > 0) items.push({ n: `Adultos (${ev.adu})`, qty: ev.adu, total: ev.adu * pAdu })
  // Menús (siempre incluir aunque no tengan precio)
  if (ev.mrows) ev.mrows.forEach(r => {
    const m = (config.menus || []).find(x => String(x.id) === String(r.mid))
    if (m) items.push({ n: m.n, qty: r.qty, total: (m.p || 0) * r.qty })
  })
  // Extras
  if (ev.extras) ev.extras.forEach(e => {
    if (e.custom) {
      if (e.desc) items.push({ n: e.desc, qty: e.qty, total: (e.p || 0) * e.qty })
    } else {
      const ex = (config.extras || []).find(x => String(x.id) === String(e.eid))
      if (ex) items.push({ n: ex.n, qty: e.qty, total: (e.p !== undefined ? e.p : ex.p) * e.qty })
    }
  })
  // Artículos incluidos en el evento (del formulario)
  if (ev.articulos) ev.articulos.filter(a => a.qty > 0).forEach(a => {
    items.push({ n: a.nombre, qty: a.qty, total: (a.precio || 0) * a.qty })
  })
  // Adicionales de caja del evento
  if (ev.consumos) ev.consumos.forEach(c => {
    if (c.precioUnitario > 0) items.push({ n: c.nombreProducto, qty: c.qty, total: (c.precioUnitario || 0) * c.qty })
  })
  const promo = ev.promoId ? (config.promos || []).find(p => String(p.id) === String(ev.promoId)) : null
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const descuento = promo ? Math.round(subtotal * promo.pct / 100) : 0
  const intNum = ev.interes || 0
  const intTipo = ev.interesTipo || 'pct'
  const interesVal = intNum > 0
    ? (intTipo === 'pct' ? Math.round((ev.monto || 0) * intNum / 100) : Math.round(intNum))
    : 0
  const interesPct = intTipo === 'pct' ? intNum : 0
  fetch('http://127.0.0.1:5001/print/venta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    targetAddressSpace: 'loopback',
    body: JSON.stringify({
      fecha: ev.fecha, hora: ev.hora,
      reservante: ev.reservante, telefono: ev.telefono,
      cumple: ev.cumple, edad: ev.edad,
      salon: ev.salon, chi: ev.chi, adu: ev.adu,
      items, subtotal, descuento,
      promo: promo ? promo.d : '',
      interes: interesVal, interesPct,
      total: ev.total || 0,
      pago: ev.pago, monto: ev.monto || 0, met: ev.met || '',
    }),
  }).catch(() => {})
}

function PinModal({ claves, msg, onConfirm, onCancel }) {
  const [pin, setPin] = React.useState('')
  const [err, setErr] = React.useState(false)
  const hayClaves = Array.isArray(claves) && claves.length > 0

  const tryPin = (val) => {
    if (val.length < 4) return
    const match = (claves || []).find(c => String(c.pin) === val)
    if (match) {
      onConfirm(match.nombre)
    } else {
      setErr(true)
      setPin('')
      setTimeout(() => setErr(false), 1500)
    }
  }

  return (
    <div className="ov op" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="mo" style={{ maxWidth: 380 }}>
        <div className="moh">
          <div className="mot">
            <div className="mot-icon">🔐</div>
            <span>Confirmar acción</span>
          </div>
          <button className="xcl" onClick={onCancel}>✕</button>
        </div>
        {!hayClaves ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--mu)', fontSize: 14 }}>
            No hay claves configuradas. Configuralas en <b>Datos de venta</b> antes de continuar.
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="bg2" onClick={onCancel}>Cerrar</button>
            </div>
          </div>
        ) : (
          <>
            {msg && <p style={{ color: 'var(--mu)', fontSize: 14, marginBottom: 16 }}>{msg}</p>}
            <p style={{ color: 'var(--mu)', fontSize: 13, marginBottom: 20 }}>
              Ingresá tu código de 4 dígitos para confirmar. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                autoFocus
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setPin(v)
                  tryPin(v)
                }}
                style={{
                  fontSize: 28, textAlign: 'center', letterSpacing: 14, width: 150,
                  border: `2px solid ${err ? 'var(--rd)' : 'var(--bd2)'}`,
                  borderRadius: 10, padding: '10px 16px',
                  transition: 'border-color .2s',
                }}
                placeholder="••••"
              />
            </div>
            {err && <div style={{ textAlign: 'center', color: 'var(--rd)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Código incorrecto</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="bg2" onClick={onCancel}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import Topbar from './components/Topbar'
import Login from './components/Login'

// Cumpleaños
import EventosList from './components/EventosList'
import EventoModal from './components/EventoModal'
import DetalleModal from './components/DetalleModal'
import CajaEventoModal from './components/CajaEventoModal'
import FinalizarEventoModal from './components/FinalizarEventoModal'
import CalendarioSemana from './components/CalendarioSemana'
import CalendarioMes from './components/CalendarioMes'
import Metricas from './components/Metricas'
import Config from './components/Config'
import { useEventos } from './hooks/useEventos'
import { useConfig } from './hooks/useConfig'

// Ventas
import Productos from './components/Productos'
import ProductoModal from './components/ProductoModal'
import Ventas from './components/Ventas'
import TicketModal from './components/TicketModal'
import Compras from './components/Compras'
import CompraModal from './components/CompraModal'
import Caja from './components/Caja'
import ReportesVentas from './components/ReportesVentas'
import Pedidos from './components/Pedidos'
import Asistencia from './components/Asistencia'
import Cofre from './components/Cofre'
import { useProductos } from './hooks/useProductos'
import { useCofre } from './hooks/useCofre'
import { useCajaGastos } from './hooks/useCajaGastos'
import { useVentas } from './hooks/useVentas'
import { useCompras } from './hooks/useCompras'
import { useCaja } from './hooks/useCaja'
import { useEmpleados } from './hooks/useEmpleados'
import { usePedidos } from './hooks/usePedidos'
import { useProveedores } from './hooks/useProveedores'

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kf_usuario')) || null } catch { return null }
  })
  const handleLogin = (u) => { setUsuario(u); localStorage.setItem('kf_usuario', JSON.stringify(u)) }
  const handleLogout = () => { setUsuario(null); localStorage.removeItem('kf_usuario') }
  if (!usuario) return <Login onLogin={handleLogin} />
  return <AppInner usuario={usuario} onLogout={handleLogout} />
}

function AppInner({ usuario, onLogout }) {
  const isAdmin = usuario.rol === 'admin'

  // ── Cumpleaños ──
  const {
    eventos, loading: evLoading, error,
    saveEvento, deleteEvento,
    saveEventoConsumos, marcarMenusStockAplicado, marcarConsumoCobrado,
    resetConsumoCobrado, resetMenusStockAplicado, finalizarEvento,
  } = useEventos()
  const { config, updateConfig } = useConfig()

  // ── Ventas ──
  const { productos, categorias, loading: prodLoading, saveProducto, deleteProducto, updateStock, updateCosto, bulkUpdatePrecios, saveCategoria } = useProductos()
  const { ventas, loading: ventasLoading, fetchVentas, fetchVentasRango, fetchVentasByCaja, saveVenta, anularVenta, updateVenta, editarVenta } = useVentas()
  const { compras, loading: comprasLoading, saveCompra, updateCompra, anularCompra } = useCompras()
  const { proveedores, saveProveedor, deleteProveedor } = useProveedores()
  const { cajasAbiertas, historial: cajaHistorial, loading: cajaLoading, abrirCaja, cerrarCaja } = useCaja()
  const cajaActual = cajasAbiertas[0] || null
  const { empleados, saveEmpleado, toggleEmpleado, deleteEmpleado } = useEmpleados()
  const { movimientos: cofreMovimientos, loading: cofreLoading, saldo: cofreSaldo, addMovimiento: addCofreMovimiento } = useCofre()
  const { gastos: cajaGastos, addGasto } = useCajaGastos()

  // Caja seleccionada para ventas: se persiste entre tickets, se limpia si la caja se cierra
  const [cajaSeleccionadaId, setCajaSeleccionadaId] = useState(null)
  useEffect(() => {
    const ids = cajasAbiertas.map(c => c.id)
    if (cajasAbiertas.length === 0) {
      setCajaSeleccionadaId(null)
    } else if (!cajaSeleccionadaId || !ids.includes(cajaSeleccionadaId)) {
      setCajaSeleccionadaId(cajasAbiertas[0].id)
    }
  }, [cajasAbiertas])

  // ── UI State ──
  const SECCIONES_POS = ['eventos', 'calendario', 'ventas', 'pedidos', 'compras', 'caja', 'productos']
  const [activeSection, setActiveSection] = useState('eventos')
  const [calView, setCalView] = useState('semana')

  const handleNav = useCallback((sec) => {
    if (!isAdmin && !SECCIONES_POS.includes(sec)) return
    setActiveSection(sec)
  }, [isAdmin])
  const [pinModal, setPinModal] = useState({ show: false, onConfirm: null, msg: '' })
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'ok') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const logAudit = useCallback(async (accion, clave_nombre) => {
    try {
      await supabase.from('audit_log').insert({ accion, clave_nombre })
    } catch (e) {
      console.warn('audit_log error:', e)
    }
  }, [])

  const askPin = useCallback((msg, onConfirm) => {
    setPinModal({
      show: true,
      msg,
      onConfirm: async (clave_nombre) => {
        await logAudit(msg, clave_nombre)
        await onConfirm(clave_nombre)
      },
    })
  }, [logAudit])

  const handleNavToCofre = useCallback(() => {
    askPin('Acceso al módulo Cofre.', () => {
      setPinModal({ show: false, onConfirm: null, msg: '' })
      setActiveSection('cofre')
    })
  }, [askPin])

  // ── Handlers cofre y gastos ──
  const handleAddCofreIngreso = useCallback(async (mov) => {
    await addCofreMovimiento(mov)
  }, [addCofreMovimiento])

  const handleAddGasto = useCallback(async (gasto) => {
    await addGasto(gasto)
  }, [addGasto])

  // Modals cumpleaños
  const [modalOpen, setModalOpen] = useState(false)
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [detalleId, setDetalleId] = useState(null)
  const [cajaEventoId, setCajaEventoId] = useState(null)
  const [finalizarEventoId, setFinalizarEventoId] = useState(null)

  // Modals ventas
  const [productoModalOpen, setProductoModalOpen] = useState(false)
  const [editingProductoId, setEditingProductoId] = useState(null)
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [compraModalOpen, setCompraModalOpen] = useState(false)
  const [editingCompra, setEditingCompra] = useState(null)
  const [editingVenta, setEditingVenta] = useState(null)
  const [pedidoParaCobrar, setPedidoParaCobrar] = useState(null)


  // ── Pedidos (menú digital) ──
  const handleNuevoPedido = useCallback((pedido) => {
    // Beep de notificación via Web Audio API
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
    } catch (_) {}
    addToast(`🔔 Nuevo pedido #${pedido.numero} — ${pedido.nombre}`, 'ok')
  }, [addToast])

  const { pedidos, loading: pedidosLoading, updateEstado: updateEstadoPedido, marcarCobrado, anularPedido } = usePedidos(handleNuevoPedido)

  const handleAnularPedido = useCallback((id) => {
    const p = pedidos.find(x => x.id === id)
    const info = p ? `Pedido #${p.numero} — ${p.nombre || 'sin nombre'}` : `Pedido #${id}`
    askPin(`Cancelar ${info}.`, async () => {
      setPinModal({ show: false, onConfirm: null, msg: '' })
      try { await anularPedido(id); addToast('Pedido cancelado') }
      catch (e) { addToast('Error: ' + e.message, 'err') }
    })
  }, [anularPedido, addToast, askPin])

  const handleCobrarPedido = useCallback((pedido) => {
    const itemsIniciales = (pedido.pedido_items || []).map(it => ({
      producto_id: it.producto_id || null,
      nombre_producto: it.nombre_producto,
      precio_unitario: it.precio_unitario || 0,
      cantidad: it.cantidad,
      subtotal: it.subtotal || 0,
      maneja_stock: true,
    }))
    setPedidoParaCobrar(pedido)
    setTicketModalOpen(true)
  }, [])

  const handleSaveVentaDesdePedido = useCallback(async (venta, items) => {
    const ventaGuardada = await saveVenta(venta, items, updateStock)
    if (pedidoParaCobrar) {
      await marcarCobrado(pedidoParaCobrar.id, ventaGuardada?.id || null)
      setPedidoParaCobrar(null)
    }
    addToast('✓ Pedido cobrado correctamente')
    return ventaGuardada
  }, [saveVenta, updateStock, marcarCobrado, pedidoParaCobrar, addToast])

  // ── Handlers cumpleaños ──
  const handleOpenModal = useCallback((id = null) => { setEditingId(id); setModalOpen(true) }, [])
  const handleOpenDetalle = useCallback((id) => { setDetalleId(id); setDetalleOpen(true) }, [])
  const handleAbrirCajaEvento = useCallback((id) => { setCajaEventoId(id); setDetalleOpen(false) }, [])

  const handleSave = useCallback(async (eventoData) => {
    try {
      const { _cajaId, _interesValor = 0, ...evToSave } = eventoData
      // Calcular cuánto pago nuevo hay que acreditar en caja
      const oldEv = eventoData.id ? eventos.find(e => e.id === eventoData.id) : null
      // Backward compat: eventos paid que quedaron guardados con monto=0 (bug previo)
      const oldMonto = (() => {
        if (!oldEv) return 0
        if (oldEv.pago === 'paid' && (oldEv.monto || 0) === 0 && (oldEv.total || 0) > 0) {
          return oldEv.total
        }
        return oldEv.monto || 0
      })()
      const newMonto = eventoData.monto || 0
      const deltaMonto = newMonto - oldMonto

      await saveEvento(evToSave)

      // Si hay un cobro nuevo (o seña nueva/ampliada) y hay caja seleccionada, crear venta
      const totalCaja = deltaMonto + _interesValor
      if (totalCaja > 0 && _cajaId && eventoData.pago !== 'none' && eventoData.pago !== 'cancelado') {
        const cliente = eventoData.reservante || eventoData.cumple || 'Evento'
        const label = eventoData.pago === 'sena' ? 'Seña evento' : 'Pago evento'
        await saveVenta({
          fecha: fechaHoyAR(),
          hora: new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false }),
          cliente,
          subtotal: totalCaja,
          descuento: 0,
          total: totalCaja,
          metodo_pago: eventoData.met,
          estado: 'completada',
          caja_id: _cajaId,
          obs: `${label}${_interesValor > 0 ? ` (interés $${Math.round(_interesValor).toLocaleString('es-AR')})` : ''} — ${cliente}`,
        }, [{
          producto_id: null,
          nombre_producto: `${label} — ${cliente}`,
          precio_unitario: totalCaja,
          cantidad: 1,
          subtotal: totalCaja,
        }], null)
      }

      const evExistente = eventoData.id ? eventos.find(e => e.id === eventoData.id) : null
      imprimirTicketEvento({ ...eventoData, consumos: evExistente?.consumos || eventoData.consumos || [] }, config)
      setModalOpen(false)
      addToast(eventoData.id ? '✓ Evento actualizado' : '✓ Evento creado')
    } catch (e) { addToast('Error: ' + e.message, 'err'); throw e }
  }, [saveEvento, saveVenta, eventos, config, addToast])

  const handleDelete = useCallback((id) => {
    const ev = eventos.find(e => e.id === id)
    const info = ev ? `evento de ${ev.cumple || ev.reservante || '?'} — ${ev.fecha}` : `evento #${id}`
    askPin(`Eliminar permanentemente: ${info}.`, async () => {
      setPinModal({ show: false, onConfirm: null, msg: '' })
      try { await deleteEvento(id); addToast('Evento eliminado', 'err') }
      catch (e) { addToast('Error: ' + e.message, 'err') }
    })
  }, [deleteEvento, addToast, askPin])

  // ── Handlers caja de evento ──
  // Solo persiste los consumos en DB — el stock se descuenta al cobrar
  const handleGuardarConsumos = useCallback(async (eventoId, consumos) => {
    await saveEventoConsumos(eventoId, consumos)
  }, [saveEventoConsumos])

  // Función helper: restaura stock de un ítem (y sus componentes si es compuesto)
  const restaurarStockItem = useCallback(async (productoId, qty) => {
    const prod = productos.find(p => p.id === productoId)
    if (!prod) return
    // Descuenta/restaura stock del producto solo si maneja_stock
    if (prod.maneja_stock !== false) {
      await updateStock(productoId, qty)
    }
    // Siempre procesar componentes (productos compuestos tienen maneja_stock=false pero sus componentes sí)
    if (prod.componentes?.length) {
      for (const comp of prod.componentes) {
        if (comp.producto_id) await updateStock(comp.producto_id, comp.cantidad * qty)
      }
    }
  }, [updateStock, productos])

  const handleAplicarMenuStock = useCallback(async (eventoId, menuItems) => {
    for (const item of menuItems) {
      await updateStock(item.productoId, -item.qty)
      const prod = productos.find(p => p.id === item.productoId)
      if (prod?.componentes?.length) {
        for (const comp of prod.componentes) {
          await updateStock(comp.producto_id, -(comp.cantidad * item.qty))
        }
      }
    }
    await marcarMenusStockAplicado(eventoId)
  }, [updateStock, marcarMenusStockAplicado, productos])

  const handleDeshacerMenuStock = useCallback((eventoId, menuItems) => {
    const ev = eventos.find(e => e.id === eventoId)
    const info = ev ? `${ev.cumple || ev.reservante || '?'} — ${ev.fecha}` : `#${eventoId}`
    askPin(`Deshacer stock de menús/artículos: evento ${info}.`, async () => {
      setPinModal({ show: false, onConfirm: null, msg: '' })
      for (const item of menuItems) {
        await restaurarStockItem(item.productoId, item.qty)
      }
      await resetMenusStockAplicado(eventoId)
      addToast('✓ Stock de menús restaurado')
    })
  }, [restaurarStockItem, resetMenusStockAplicado, addToast, askPin])

  const handleDeshacerCobro = useCallback((eventoId, consumos) => {
    const ev = eventos.find(e => e.id === eventoId)
    const info = ev ? `${ev.cumple || ev.reservante || '?'} — ${ev.fecha}` : `#${eventoId}`
    askPin(`Deshacer cobro de adicionales: evento ${info}.`, async () => {
      setPinModal({ show: false, onConfirm: null, msg: '' })
      const cobrados = consumos.filter(c => c.cobrado)
      for (const c of cobrados) {
        if (c.productoId) await restaurarStockItem(c.productoId, c.qty)
      }
      const consumosReseteados = consumos.map(c => ({ ...c, cobrado: false }))
      await saveEventoConsumos(eventoId, consumosReseteados)
      addToast('✓ Cobro deshecho · stock restaurado')
    })
  }, [restaurarStockItem, saveEventoConsumos, addToast, askPin])

  const handleCobrarAdicionales = useCallback(async ({ eventoId, consumosPendientes, todosConsumos, total, metodoPago, cajaId }) => {
    const ev = eventos.find(e => e.id === eventoId)
    const fecha = fechaHoyAR()
    const hora = new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false })
    const cliente = ev ? `${ev.cumple || ev.reservante || ''} (evento)`.trim() : 'Evento'

    const venta = {
      fecha,
      hora,
      cliente,
      subtotal: total,
      descuento: 0,
      total,
      metodo_pago: metodoPago,
      estado: 'completada',
      caja_id: cajaId,
      obs: `Adicionales evento #${eventoId}`,
    }

    const items = consumosPendientes.map(c => ({
      producto_id: c.productoId,
      nombre_producto: c.nombreProducto,
      precio_unitario: c.precioUnitario || 0,
      cantidad: c.qty,
      subtotal: (c.precioUnitario || 0) * c.qty,
    }))

    // Crear la venta sin que saveVenta descuente stock (pasamos null)
    await saveVenta(venta, items, null)

    // Descontar stock de los ítems pendientes (incluye componentes de productos compuestos)
    for (const c of consumosPendientes) {
      if (c.productoId) await restaurarStockItem(c.productoId, -c.qty)
    }

    // Marcar los pendientes como cobrados y guardar en DB
    const consumosActualizados = todosConsumos.map(c => c.cobrado ? c : { ...c, cobrado: true })
    await saveEventoConsumos(eventoId, consumosActualizados)
  }, [eventos, saveVenta, restaurarStockItem, saveEventoConsumos])

  // ── Finalizar evento ──
  const handleAbrirFinalizar = useCallback((id) => {
    setDetalleOpen(false)
    setFinalizarEventoId(id)
  }, [])

  const handleFinalizarEvento = useCallback(async ({ metodoPago, cajaId, saldoEvento, consumosPendientes, totalFinal }) => {
    const ev = eventos.find(e => e.id === finalizarEventoId)
    if (!ev) return

    const fecha = fechaHoyAR()
    const hora = new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false })
    const cliente = ev.reservante || ev.cumple || 'Evento'

    if (totalFinal > 0 && cajaId) {
      const items = []
      if (saldoEvento > 0) {
        items.push({
          producto_id: null,
          nombre_producto: `Saldo evento — ${cliente}`,
          precio_unitario: saldoEvento,
          cantidad: 1,
          subtotal: saldoEvento,
          maneja_stock: false,
        })
      }
      for (const c of consumosPendientes) {
        items.push({
          producto_id: c.productoId || null,
          nombre_producto: c.nombreProducto,
          precio_unitario: c.precioUnitario || 0,
          cantidad: c.qty,
          subtotal: (c.precioUnitario || 0) * c.qty,
          maneja_stock: !!c.productoId,
        })
        if (c.productoId) await restaurarStockItem(c.productoId, -c.qty)
      }

      const venta = {
        fecha, hora, cliente,
        subtotal: totalFinal, descuento: 0, total: totalFinal,
        metodo_pago: metodoPago, estado: 'completada',
        caja_id: cajaId,
        obs: `Finalización evento — ${cliente}`,
      }
      await saveVenta(venta, items, null)
    }

    await finalizarEvento(finalizarEventoId, { monto: ev.total, met: metodoPago })
    setFinalizarEventoId(null)
    addToast('✅ Evento finalizado y cobro registrado en caja')
  }, [eventos, finalizarEventoId, saveVenta, finalizarEvento, restaurarStockItem, addToast])

  // ── Handlers productos ──
  const handleOpenProducto = useCallback((id = null) => { setEditingProductoId(id); setProductoModalOpen(true) }, [])

  const handleSaveProducto = useCallback(async (p) => {
    await saveProducto(p)
    setProductoModalOpen(false)
    addToast(p.id ? '✓ Producto actualizado' : '✓ Producto creado')
  }, [saveProducto, addToast])

  const handleDeleteProducto = useCallback((id) => {
    const prod = productos.find(p => p.id === id)
    const info = prod ? `"${prod.nombre}"` : `#${id}`
    askPin(`Eliminar producto ${info} permanentemente.`, async () => {
      setPinModal({ show: false, onConfirm: null, msg: '' })
      try { await deleteProducto(id); addToast('Producto eliminado', 'err') }
      catch (e) { addToast('Error: ' + e.message, 'err') }
    })
  }, [deleteProducto, addToast, askPin])

  // ── Handlers ventas ──
  const handleSaveVenta = useCallback(async (venta, items) => {
    const ventaGuardada = await saveVenta(venta, items, updateStock)
    addToast('✓ Venta registrada correctamente')
    return ventaGuardada
  }, [saveVenta, updateStock, addToast])

  const handleAnularVenta = useCallback((id) => {
    const v = ventas.find(x => x.id === id)
    const info = v ? `ticket #${v.numero || id} — ${v.cliente || 'sin cliente'} — $${v.total}` : `#${id}`
    askPin(`Anular venta: ${info}. Se revertirá el stock.`, async () => {
      setPinModal({ show: false, onConfirm: null, msg: '' })
      try { await anularVenta(id, updateStock, productos); addToast('Venta anulada') }
      catch (e) { addToast('Error: ' + e.message, 'err') }
    })
  }, [anularVenta, updateStock, addToast, askPin, productos])

  const handleModificarVenta = useCallback((venta) => {
    askPin(`Modificar ticket ${venta.numero}`, () => {
      setPinModal({ show: false, onConfirm: null, msg: '' })
      setEditingVenta(venta)
    })
  }, [askPin])

  const handleSaveEdicionVenta = useCallback(async (id, venta, items) => {
    try {
      await editarVenta(id, venta, items, updateStock, productos)
      setEditingVenta(null)
      addToast('✓ Venta modificada')
    } catch (e) {
      addToast('Error: ' + e.message, 'err')
    }
  }, [editarVenta, updateStock, addToast, productos])

  // ── Handlers compras ──
  const handleSaveCompra = useCallback(async (compra, items, oldItems) => {
    if (compra.id) {
      await updateCompra(compra, items, oldItems || [], updateStock, updateCosto)
      setEditingCompra(null)
      addToast('✓ Compra actualizada · stock y costos recalculados')
    } else {
      await saveCompra(compra, items, updateStock, updateCosto)
      setCompraModalOpen(false)
      addToast('✓ Compra registrada · stock y costos actualizados')
    }
  }, [saveCompra, updateCompra, updateStock, updateCosto, addToast])

  const handleEditarCompra = useCallback((compra) => {
    setEditingCompra(compra)
  }, [])

  const handleAnularCompra = useCallback((compra) => {
    askPin(`Anular compra: ${compra.proveedor || 'sin proveedor'}${compra.numero_remito ? ` remito ${compra.numero_remito}` : ''} — $${compra.total}. Se revertirá el stock.`, async () => {
      setPinModal({ show: false, onConfirm: null, msg: '' })
      try {
        await anularCompra(compra.id, compra.compra_items || [], updateStock)
        addToast('Compra anulada · stock revertido', 'err')
      } catch (e) {
        addToast('Error: ' + e.message, 'err')
      }
    })
  }, [anularCompra, updateStock, addToast, askPin])

  // ── Handlers caja ──
  const handleAbrirCaja = useCallback(async ({ saldo_inicial, nombre, turno }) => {
    await abrirCaja({ saldo_inicial, nombre, turno })
  }, [abrirCaja])

  const handleCerrarCaja = useCallback(async ({ cajaId, ...datos }) => {
    await cerrarCaja({ cajaId, ...datos })
  }, [cerrarCaja])

  const editingEvento = editingId ? eventos.find(e => e.id === editingId) : null
  const detalleEvento = detalleId ? eventos.find(e => e.id === detalleId) : null
  const cajaEvento = cajaEventoId ? eventos.find(e => e.id === cajaEventoId) : null
  const editingProducto = editingProductoId ? productos.find(p => p.id === editingProductoId) : null

  return (
    <>
      <Topbar
        activeSection={activeSection}
        onNav={handleNav}
        onNuevo={() => handleOpenModal()}
        cajaActual={cajaActual}
        onNavCofre={handleNavToCofre}
        usuario={usuario}
        onLogout={onLogout}
      />

      <div className="content">
        {error && (
          <div style={{ background: 'var(--rdb)', border: '1px solid rgba(163,32,32,.35)', borderRadius: 10, padding: '11px 16px', color: 'var(--rd)', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            ⚠ Error al conectar con la base de datos: {error}
          </div>
        )}

        {/* ── CUMPLEAÑOS ── */}
        {activeSection === 'eventos' && (
          <div className="sec">
            <EventosList
              eventos={eventos} loading={evLoading} config={config}
              onEditar={handleOpenModal} onEliminar={handleDelete}
              onNuevo={() => handleOpenModal()} onVerDetalle={handleOpenDetalle}
              onAbrirCaja={handleAbrirCajaEvento} onFinalizar={handleAbrirFinalizar}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {activeSection === 'calendario' && (
          <div className="sec">
            <div className="ph">
              <div>
                <div className="pt">Calendario</div>
                <div className="ps">{calView === 'semana' ? 'Próximos 7 días' : 'Vista mensual'}</div>
              </div>
              <button className="bp" onClick={() => handleOpenModal()}>＋ Nuevo evento</button>
            </div>
            <div className="cal-topbar">
              <div className="cal-view-toggle">
                <button className={`cal-vbtn${calView === 'semana' ? ' active' : ''}`} onClick={() => setCalView('semana')}>📋 Semana</button>
                <button className={`cal-vbtn${calView === 'mes' ? ' active' : ''}`} onClick={() => setCalView('mes')}>🗓 Mes</button>
              </div>
            </div>
            {calView === 'semana'
              ? <CalendarioSemana eventos={eventos} onEditar={handleOpenModal} onVerDetalle={handleOpenDetalle} />
              : <CalendarioMes
                  eventos={eventos} onEditar={handleOpenModal} onVerDetalle={handleOpenDetalle}
                  notas={config.notas_calendario || []}
                  onSaveNota={async (nota) => {
                    const notas = config.notas_calendario || []
                    const newNotas = nota.id
                      ? notas.map(n => n.id === nota.id ? nota : n)
                      : [...notas, { ...nota, id: String(Date.now()) }]
                    await updateConfig('notas_calendario', newNotas)
                  }}
                  onDeleteNota={async (id) => {
                    const notas = config.notas_calendario || []
                    await updateConfig('notas_calendario', notas.filter(n => n.id !== id))
                  }}
                  isAdmin={isAdmin}
                />
            }
          </div>
        )}

        {activeSection === 'metricas' && (
          <div className="sec"><Metricas eventos={eventos} /></div>
        )}

        {activeSection === 'config' && (
          <div className="sec">
            <Config config={config} updateConfig={updateConfig} addToast={addToast} productos={productos} categorias={categorias}
              empleados={empleados} saveEmpleado={saveEmpleado} toggleEmpleado={toggleEmpleado} deleteEmpleado={deleteEmpleado} askPin={askPin} />
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {activeSection === 'pedidos' && (
          <Pedidos
            pedidos={pedidos}
            loading={pedidosLoading}
            onUpdateEstado={updateEstadoPedido}
            onCobrar={handleCobrarPedido}
            onAnular={handleAnularPedido}
          />
        )}

        {/* ── ASISTENCIA ── */}
        {activeSection === 'asistencia' && (
          <Asistencia empleados={empleados} />
        )}

        {/* ── VENTAS ── */}
        {activeSection === 'ventas' && (
          <Ventas
            ventas={ventas} loading={ventasLoading} cajaActual={cajaActual}
            onNueva={() => setTicketModalOpen(true)}
            onAnular={handleAnularVenta}
            onModificar={handleModificarVenta}
            fetchVentasRango={fetchVentasRango}
            empleados={empleados}
            isAdmin={isAdmin}
          />
        )}

        {activeSection === 'compras' && (
          <Compras
            compras={compras} loading={comprasLoading}
            onNueva={() => setCompraModalOpen(true)}
            onEditar={handleEditarCompra}
            onAnular={handleAnularCompra}
            proveedores={proveedores}
            onSaveProveedor={saveProveedor}
            onDeleteProveedor={deleteProveedor}
            addToast={addToast}
            askPin={askPin}
          />
        )}

        {activeSection === 'caja' && (
          <Caja
            cajasAbiertas={cajasAbiertas} historial={cajaHistorial} loading={cajaLoading}
            ventas={ventas} gastos={cajaGastos} empleados={empleados}
            onAbrir={handleAbrirCaja}
            onCerrar={handleCerrarCaja}
            onAddGasto={handleAddGasto}
            onAddCofreIngreso={handleAddCofreIngreso}
            onAnularVenta={handleAnularVenta}
            onModificarVenta={handleModificarVenta}
            onRefreshVentas={fetchVentas}
            fetchVentasByCaja={fetchVentasByCaja}
            addToast={addToast}
            askPin={askPin}
          />
        )}

        {activeSection === 'productos' && (
          <Productos
            productos={productos} categorias={categorias} loading={prodLoading}
            onNuevo={() => handleOpenProducto()}
            onEditar={handleOpenProducto}
            onEliminar={handleDeleteProducto}
            addToast={addToast}
            bulkUpdatePrecios={bulkUpdatePrecios}
          />
        )}

        {activeSection === 'reportes' && (
          <ReportesVentas ventas={ventas} productos={productos} categorias={categorias} fetchVentasRango={fetchVentasRango} />
        )}

        {activeSection === 'cofre' && (
          <Cofre
            movimientos={cofreMovimientos}
            saldo={cofreSaldo}
            loading={cofreLoading}
            onAddRetiro={addCofreMovimiento}
            empleados={empleados}
            askPin={askPin}
            addToast={addToast}
          />
        )}
      </div>

      {/* ── MODALS CUMPLEAÑOS ── */}
      {modalOpen && (
        <EventoModal
          evento={editingEvento} eventos={eventos} config={config} productos={productos}
          cajasAbiertas={cajasAbiertas}
          onSave={handleSave} onClose={() => setModalOpen(false)} addToast={addToast}
        />
      )}
      {detalleOpen && detalleEvento && (
        <DetalleModal
          evento={detalleEvento} config={config}
          onClose={() => setDetalleOpen(false)}
          onEditar={(id) => { setDetalleOpen(false); handleOpenModal(id) }}
          onAbrirCaja={handleAbrirCajaEvento}
          onFinalizar={handleAbrirFinalizar}
        />
      )}
      {finalizarEventoId && (
        <FinalizarEventoModal
          evento={eventos.find(e => e.id === finalizarEventoId)}
          cajasAbiertas={cajasAbiertas}
          config={config}
          onFinalizar={handleFinalizarEvento}
          onClose={() => setFinalizarEventoId(null)}
        />
      )}
      {cajaEvento && (
        <CajaEventoModal
          evento={cajaEvento}
          config={config}
          productos={productos}
          cajasAbiertas={cajasAbiertas}
          onClose={() => setCajaEventoId(null)}
          onGuardarConsumos={handleGuardarConsumos}
          onAplicarMenuStock={handleAplicarMenuStock}
          onDeshacerMenuStock={handleDeshacerMenuStock}
          onCobrar={handleCobrarAdicionales}
          onDeshacerCobro={handleDeshacerCobro}
          addToast={addToast}
        />
      )}

      {/* ── MODALS VENTAS ── */}
      {productoModalOpen && (
        <ProductoModal
          producto={editingProducto} productos={productos} categorias={categorias}
          onSave={handleSaveProducto} onClose={() => setProductoModalOpen(false)}
          addToast={addToast} onNuevaCat={saveCategoria}
        />
      )}

      {(ticketModalOpen || editingVenta) && (
        <TicketModal
          productos={productos}
          categorias={categorias}
          cajasAbiertas={cajasAbiertas}
          cajaSeleccionadaId={cajaSeleccionadaId}
          onCajaChange={setCajaSeleccionadaId}
          metodosPago={config.mets_caja}
          empleados={empleados}
          ventaEditar={editingVenta}
          onSaveEdicion={handleSaveEdicionVenta}
          itemsIniciales={pedidoParaCobrar ? (pedidoParaCobrar.pedido_items || []).map(it => ({
            producto_id: it.producto_id || null,
            nombre_producto: it.nombre_producto,
            precio_unitario: it.precio_unitario || 0,
            cantidad: it.cantidad,
            subtotal: it.subtotal || 0,
            maneja_stock: true,
          })) : []}
          clienteInicial={pedidoParaCobrar?.nombre || ''}
          onSave={pedidoParaCobrar ? handleSaveVentaDesdePedido : handleSaveVenta}
          onClose={() => { setTicketModalOpen(false); setEditingVenta(null); setPedidoParaCobrar(null) }}
          addToast={addToast}
        />
      )}

      {(compraModalOpen || editingCompra) && (
        <CompraModal
          compra={editingCompra}
          productos={productos}
          proveedores={proveedores}
          metodosPago={config.mets_caja}
          onSave={handleSaveCompra}
          onClose={() => { setCompraModalOpen(false); setEditingCompra(null) }}
          addToast={addToast}
        />
      )}

      {pinModal.show && (
        <PinModal
          claves={config.claves || []}
          msg={pinModal.msg}
          onConfirm={pinModal.onConfirm}
          onCancel={() => setPinModal({ show: false, onConfirm: null, msg: '' })}
        />
      )}

      <div id="toast-cont">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </>
  )
}
