import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { fmt } from '../utils'

const EMPTY_FORM = {
  reservante: '', telefono: '', cumple: '', edad: '',
  fecha: '', horaH: '', horaM: '00', horaLibre: '',
  salon: '', tipo: '',
  chi: 0, adu: 0,
  privado: false, obs: '',
  promoId: '',
  interes: 0, interesTipo: 'pct',
  pago: 'none', monto: 0, met: '',
  extendido: false,
  extendido_mins: 30,
}

function addMinutesToHora(hora, mins) {
  if (!hora || !/^\d{1,2}:\d{2}$/.test(hora)) return ''
  const [hh, mm] = hora.split(':').map(Number)
  const total = hh * 60 + mm + mins
  const rh = Math.floor(total / 60) % 24
  const rm = total % 60
  return String(rh).padStart(2, '0') + ':' + String(rm).padStart(2, '0')
}

function horaToMins(hora) {
  if (!hora) return -1
  // Acepta "HH:MM" y "HH:MM:SS" (formato Supabase TIME)
  const clean = String(hora).slice(0, 5)
  if (!/^\d{1,2}:\d{2}$/.test(clean)) return -1
  const [h, m] = clean.split(':').map(Number)
  return h * 60 + m
}

// Compute hora string from form fields
function getHora(form) {
  const libre = form.horaLibre.trim()
  if (libre && /^\d{1,2}:\d{2}$/.test(libre)) return libre
  if (form.horaH) return form.horaH + ':' + form.horaM
  return ''
}

export default function EventoModal({ evento, eventos, config, productos = [], cajasAbiertas = [], onSave, onClose, addToast }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [mrows, setMrows] = useState([]) // [{rid, mid, qty}]
  const [extraQtys, setExtraQtys] = useState({}) // {eid: qty}
  const [extraPrices, setExtraPrices] = useState({}) // {eid: customPrice}
  const [adHocExtras, setAdHocExtras] = useState([]) // [{rid, desc, qty, p}]
  const [articulosEvento, setArticulosEvento] = useState([]) // [{rid, producto_id, nombre, qty, precio}]
  const [artBusca, setArtBusca] = useState('')
  const [saving, setSaving] = useState(false)
  const [multiMet, setMultiMet] = useState(false)
  const [metsPagados, setMetsPagados] = useState([{ id: 1, met: 'Efectivo', monto: '' }])
  const [cajaId, setCajaId] = useState(() => cajasAbiertas[0]?.id || null)

  // Para edición de eventos ya pagados o con seña: monto ya cobrado previamente
  const esEdicionPagada = Boolean(evento?.id && evento?.pago === 'paid')
  const esEdicionSena = Boolean(evento?.id && evento?.pago === 'sena')
  // Backward compat: eventos paid guardados con monto=0 (bug previo) → usar total como base
  const yaCobrado = (() => {
    if (!evento?.id) return 0
    if (evento.pago === 'paid' && (evento.monto || 0) === 0 && (evento.total || 0) > 0) {
      return evento.total
    }
    return evento.monto || 0
  })()

  const [adicionalSena, setAdicionalSena] = useState(0)

  // Populate form from evento
  useEffect(() => {
    if (evento) {
      const [hh, mm] = (evento.hora || '').split(':')
      const stdMins = ['00', '15', '30', '45']
      const isStdMin = stdMins.includes(mm)
      setForm({
        reservante: evento.reservante || '',
        telefono: evento.telefono || '',
        cumple: evento.cumple || '',
        edad: evento.edad || '',
        fecha: evento.fecha || '',
        horaH: hh || '',
        horaM: isStdMin ? mm : '00',
        horaLibre: !isStdMin && mm ? (evento.hora || '') : '',
        salon: evento.salon || '',
        tipo: evento.tipo || '',
        chi: evento.chi || 0,
        adu: evento.adu || 0,
        privado: evento.privado || false,
        obs: evento.obs || '',
        promoId: evento.promoId ? String(evento.promoId) : '',
        interes: evento.interes || 0,
        interesTipo: evento.interesTipo || 'pct',
        pago: evento.pago || 'none',
        monto: evento.monto || 0,
        met: (config.mets || []).find(m => (evento.met || '').startsWith(m)) || evento.met || '',
        extendido: evento.extendido || false,
        extendido_mins: evento.extendido_mins || 30,
      })
      // Restore menu rows
      const rows = (evento.mrows || []).map(r => ({ rid: Date.now() + Math.random(), mid: String(r.mid), qty: r.qty || 1 }))
      setMrows(rows.length > 0 ? rows : [{ rid: Date.now(), mid: '', qty: 1 }])
      // Restore extra quantities, custom prices and ad-hoc extras
      const qtys = {}
      const prices = {}
      const adHoc = []
      ;(evento.extras || []).forEach(e => {
        if (e.custom) {
          adHoc.push({ rid: Date.now() + Math.random(), desc: e.desc || '', qty: e.qty || 1, p: e.p || 0 })
        } else {
          qtys[String(e.eid)] = e.qty || 0
          if (e.p !== undefined) prices[String(e.eid)] = e.p
        }
      })
      setExtraQtys(qtys)
      setExtraPrices(prices)
      setAdHocExtras(adHoc)
      const arts = (evento.articulos || []).map(a => ({
        rid: Date.now() + Math.random(),
        producto_id: a.producto_id,
        nombre: a.nombre,
        qty: a.qty || 1,
        precio: a.precio || 0,
      }))
      setArticulosEvento(arts)
      setMultiMet(false)
      setMetsPagados([{ id: 1, met: 'Efectivo', monto: '' }])
      setAdicionalSena(0)
    } else {
      setForm(EMPTY_FORM)
      setMrows([{ rid: Date.now(), mid: '', qty: 1 }])
      setExtraQtys({})
      setExtraPrices({})
      setAdHocExtras([])
      setArticulosEvento([])
      setArtBusca('')
      setMultiMet(false)
      setMetsPagados([{ id: 1, met: 'Efectivo', monto: '' }])
      setAdicionalSena(0)
    }
  }, [evento])

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  // Menu row handlers
  const addMRow = () => setMrows(prev => [...prev, { rid: Date.now() + Math.random(), mid: '', qty: 1 }])
  const removeMRow = rid => setMrows(prev => prev.filter(r => r.rid !== rid))
  const updateMRow = (rid, field, val) => setMrows(prev => prev.map(r => r.rid === rid ? { ...r, [field]: val } : r))

  // Extra quantity handler
  const setExtraQty = (eid, qty) => setExtraQtys(prev => ({ ...prev, [String(eid)]: parseInt(qty) || 0 }))
  // Extra custom price handler
  const setExtraPrice = (eid, val) => setExtraPrices(prev => ({ ...prev, [String(eid)]: parseFloat(val) || 0 }))
  // Ad-hoc extras handlers
  const addAdHoc = () => setAdHocExtras(prev => [...prev, { rid: Date.now() + Math.random(), desc: '', qty: 1, p: 0 }])
  const removeAdHoc = rid => setAdHocExtras(prev => prev.filter(r => r.rid !== rid))
  const updateAdHoc = (rid, field, val) => setAdHocExtras(prev => prev.map(r => r.rid === rid ? { ...r, [field]: val } : r))

  function toggleMultiMet() {
    if (!multiMet) {
      const cleanMet = (config.mets || []).find(m => (form.met || '').startsWith(m)) || config.mets[0] || 'Efectivo'
      setMetsPagados([{ id: 1, met: cleanMet, monto: '' }])
      setMultiMet(true)
    } else {
      setMultiMet(false)
      setMetsPagados([{ id: 1, met: config.mets[0] || 'Efectivo', monto: '' }])
    }
  }
  function addMetPagado() {
    setMetsPagados(prev => [...prev, { id: Date.now(), met: config.mets[0] || 'Efectivo', monto: '' }])
  }
  function removeMetPagado(id) {
    setMetsPagados(prev => prev.filter(m => m.id !== id))
  }
  function updateMetPagado(id, field, val) {
    setMetsPagados(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m))
  }

  // Precio por chico/adulto: si el evento ya tiene precio grabado, usarlo; si es nuevo, usar config
  const pChicoEv = evento?.precioChico != null ? evento.precioChico : (config.pChico || 0)
  const pAdultoEv = evento?.precioAdulto != null ? evento.precioAdulto : (config.pAdulto || 0)

  // Computed totals
  const calc = useMemo(() => {
    const chi = parseInt(form.chi) || 0
    const adu = parseInt(form.adu) || 0
    const base = chi * pChicoEv + adu * pAdultoEv
    const mTot = mrows.reduce((acc, r) => {
      const m = config.menus.find(x => String(x.id) === String(r.mid))
      return acc + (m && m.p ? m.p * (parseInt(r.qty) || 0) : 0)
    }, 0)
    const eTot = Object.entries(extraQtys).reduce((acc, [eid, qty]) => {
      const ex = config.extras.find(x => String(x.id) === String(eid))
      const price = extraPrices[String(eid)] !== undefined ? extraPrices[String(eid)] : (ex ? ex.p : 0)
      return acc + price * (qty || 0)
    }, 0) + adHocExtras.reduce((acc, r) => acc + (parseFloat(r.p) || 0) * (parseInt(r.qty) || 0), 0)
    const artTot = articulosEvento.reduce((acc, a) => acc + (a.precio || 0) * (a.qty || 0), 0)
    let dto = 0
    if (form.promoId) {
      const pr = config.promos.find(p => String(p.id) === String(form.promoId))
      if (pr) dto = (base + mTot + eTot + artTot) * pr.pct / 100
    }
    const subtotalSinInteres = base + mTot + eTot + artTot - dto
    const intVal = parseFloat(form.interes) || 0
    const intTipo = form.interesTipo || 'pct'
    const total = subtotalSinInteres  // Total del evento SIN interés

    // Calcular interés sobre el monto del pago actual, no sobre el total del evento
    let montoParaInteres = 0
    if (intVal > 0 && intTipo === 'pct') {
      if (esEdicionSena) {
        if (form.pago === 'sena') {
          montoParaInteres = multiMet
            ? metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0)
            : adicionalSena
        } else if (form.pago === 'paid') {
          montoParaInteres = multiMet
            ? metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0)
            : Math.max(0, total - yaCobrado)
        }
      } else if (esEdicionPagada && multiMet) {
        montoParaInteres = metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0)
      } else {
        // Evento nuevo o primera seña
        if (form.pago === 'paid') {
          montoParaInteres = multiMet
            ? metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0)
            : total
        } else if (form.pago === 'sena') {
          montoParaInteres = multiMet
            ? metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0)
            : (parseFloat(form.monto) || 0)
        }
      }
    }

    const interes = intVal > 0
      ? (intTipo === 'pct' ? Math.round(montoParaInteres * intVal / 100) : Math.round(intVal))
      : 0
    const monto = parseFloat(form.monto) || 0
    return { base, mTot, eTot, artTot, dto, interes, intVal, intTipo, total, monto, rest: Math.max(0, total - monto) }
  }, [form.chi, form.adu, form.promoId, form.interes, form.interesTipo, form.monto, form.pago, extraQtys, extraPrices, adHocExtras, articulosEvento, config, mrows, pChicoEv, pAdultoEv, esEdicionSena, esEdicionPagada, yaCobrado, adicionalSena, multiMet, metsPagados])

  // Duplicate / overlap check
  // - Evento privado nuevo: bloquea si hay CUALQUIER evento en esa fecha/hora (cualquier salón)
  // - Evento normal nuevo: bloquea si hay solapamiento en el mismo salón O si existe un evento privado en esa hora
  const dupAlert = useMemo(() => {
    const hora = getHora(form)
    if (!form.fecha || !hora || !form.salon) return false

    const newStart = horaToMins(hora)
    const newEnd = horaToMins(addMinutesToHora(hora, 150 + (form.extendido ? (form.extendido_mins || 30) : 0)))
    if (newStart < 0 || newEnd < 0) return false

    const conflicto = eventos.find(ev => {
      if (ev.id === evento?.id) return false
      if (ev.fecha !== form.fecha) return false
      if (ev.pago === 'cancelado') return false
      const evStart = horaToMins(ev.hora)
      if (evStart < 0) return false
      // Si hora_hasta no está disponible, estimar duración por defecto
      let evEnd = horaToMins(ev.hora_hasta)
      if (evEnd < 0) evEnd = evStart + (ev.extendido ? ((ev.extendido_mins || 30) + 150) : 150)
      const overlaps = newStart < evEnd && evStart < newEnd
      if (!overlaps) return false
      // Evento nuevo privado → cualquier solapamiento en cualquier salón bloquea
      if (form.privado) return true
      // Evento existente privado → bloquea todos los salones
      if (ev.privado) return true
      // Caso normal: solo mismo salón
      return ev.salon === form.salon
    })

    if (!conflicto) return null
    if (form.privado) return 'No se puede cargar el evento privado: ya existe un evento en esa fecha y horario.'
    if (conflicto.privado) return `Ese horario está bloqueado por un evento privado en ${conflicto.salon || 'otro salón'}.`
    return 'Ya existe un evento en ese salón, fecha y horario.'
  }, [form.fecha, form.horaH, form.horaM, form.horaLibre, form.salon, form.extendido, form.extendido_mins, form.privado, eventos, evento])

  // Menu qty mismatch
  const menuAlert = useMemo(() => {
    if (form.pago === 'cancelado') return null
    const chi = parseInt(form.chi) || 0
    if (chi === 0) return null
    const total = mrows.reduce((acc, r) => acc + (parseInt(r.qty) || 0), 0)
    if (total === chi) return null
    const diff = chi - total
    return diff > 0
      ? `⚠ Faltan ${diff} menú${diff !== 1 ? 's' : ''}: tenés ${total} asignado${total !== 1 ? 's' : ''} para ${chi} chico${chi !== 1 ? 's' : ''}.`
      : `⚠ Sobran ${Math.abs(diff)} menú${Math.abs(diff) !== 1 ? 's' : ''}: tenés ${total} asignado${total !== 1 ? 's' : ''} para ${chi} chico${chi !== 1 ? 's' : ''}.`
  }, [form.pago, form.chi, mrows])

  const handleSave = async () => {
    const hora = getHora(form)
    if (!form.fecha || !hora || !form.salon) {
      addToast('Completá fecha, horario y salón.', 'err')
      return
    }
    if (dupAlert) {
      addToast(dupAlert, 'err')
      return
    }
    if (form.pago !== 'none' && form.pago !== 'cancelado') {
      if (multiMet) {
        if (metsPagados.some(m => !m.monto || parseFloat(m.monto) <= 0)) {
          addToast('Completá los montos de cada método de pago.', 'err')
          return
        }
      } else if (!form.met) {
        addToast('Seleccioná el método de pago.', 'err')
        return
      }
    }
    const chi = parseInt(form.chi) || 0
    if (chi > 0 && menuAlert) {
      addToast('La cantidad de menús no coincide con los chicos. Corregila antes de guardar.', 'err')
      return
    }

    const articulosSave = articulosEvento
      .filter(a => a.producto_id && a.qty > 0)
      .map(a => ({ producto_id: a.producto_id, nombre: a.nombre, qty: a.qty, precio: a.precio }))

    const mrowsSave = mrows.filter(r => r.mid).map(r => ({ mid: r.mid, qty: parseInt(r.qty) || 0 }))
    const extrasSave = [
      ...Object.entries(extraQtys)
        .filter(([, qty]) => qty > 0)
        .map(([eid, qty]) => {
          const ex = config.extras.find(x => String(x.id) === String(eid))
          const customP = extraPrices[String(eid)]
          const price = customP !== undefined ? customP : (ex?.p || 0)
          return { eid, qty, p: price }
        }),
      ...adHocExtras
        .filter(r => r.desc.trim() && parseInt(r.qty) > 0)
        .map(r => ({ custom: true, desc: r.desc.trim(), qty: parseInt(r.qty), p: parseFloat(r.p) || 0 }))
    ]

    const horaHasta = addMinutesToHora(hora, 150 + (form.extendido ? (form.extendido_mins || 30) : 0))

    let metFinal = form.met
    let montoFinal = parseFloat(form.monto) || 0
    if (multiMet && form.pago !== 'none' && form.pago !== 'cancelado') {
      metFinal = metsPagados.map(m => `${m.met} $${Math.round(parseFloat(m.monto) || 0).toLocaleString('es-AR')}`).join(' + ')
      const adicionalMulti = metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0)
      if (esEdicionPagada && form.pago === 'paid') {
        // Montos ingresados son incrementales; el acumulado = ya cobrado + adicional
        montoFinal = yaCobrado + adicionalMulti
      } else if (esEdicionSena && form.pago === 'sena') {
        // Seña acumulada = ya cobrado + adicional ingresado ahora
        montoFinal = yaCobrado + adicionalMulti
      } else if (esEdicionSena && form.pago === 'paid') {
        // Cambio de seña a pago completo: multi-método cubre el saldo restante
        montoFinal = yaCobrado + adicionalMulti
      } else {
        montoFinal = adicionalMulti
      }
    } else if (esEdicionPagada && form.pago === 'paid') {
      // El monto acumulado nunca puede bajar del ya cobrado (solo sube)
      // Así deltaMonto en App.jsx = adicional - solo lo nuevo
      montoFinal = Math.max(calc.total, yaCobrado)
    } else if (esEdicionSena && form.pago === 'sena') {
      // Seña acumulada = ya cobrado + adicional ingresado ahora
      montoFinal = yaCobrado + adicionalSena
    } else if (esEdicionSena && form.pago === 'paid') {
      // Cambio de seña a pago completo: cobrar el saldo restante (total - seña ya pagada)
      montoFinal = Math.max(calc.total, yaCobrado)
    }

    // Fallback: nuevo evento (o edición sin monto) marcado como paid pero monto no completado
    if (!multiMet && !esEdicionPagada && !esEdicionSena && form.pago === 'paid' && montoFinal === 0) {
      montoFinal = calc.total
    }

    const ev = {
      id: evento?.id,
      fecha: form.fecha,
      hora,
      hora_hasta: horaHasta,
      extendido: form.extendido,
      extendido_mins: form.extendido ? (form.extendido_mins || 30) : 0,
      salon: form.salon,
      tipo: form.tipo,
      reservante: form.reservante.trim(),
      telefono: form.telefono.trim(),
      cumple: form.cumple.trim(),
      edad: form.edad.trim(),
      privado: form.privado,
      chi: parseInt(form.chi) || 0,
      adu: parseInt(form.adu) || 0,
      precioChico: pChicoEv,
      precioAdulto: pAdultoEv,
      mrows: mrowsSave,
      extras: extrasSave,
      articulos: articulosSave,
      promoId: form.promoId || null,
      interes: parseFloat(form.interes) || 0,
      interesTipo: form.interesTipo || 'pct',
      obs: form.obs,
      pago: form.pago,
      monto: montoFinal,
      met: metFinal,
      total: calc.total,
      _interesValor: calc.interes,
      _cajaId: (form.pago !== 'none' && form.pago !== 'cancelado') ? cajaId : null,
    }

    setSaving(true)
    try {
      await onSave(ev)
    } catch {
      // onSave already calls addToast on error
    } finally {
      setSaving(false)
    }
  }

  const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

  return (
    <div className="ov op" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mo">
        {/* Header */}
        <div className="moh">
          <div className="mot">
            <div className="mot-icon">🎂</div>
            <span>{evento ? 'Editar cumpleaños' : 'Nuevo cumpleaños'}</span>
          </div>
          <button className="xcl" onClick={onClose}>✕</button>
        </div>

        {dupAlert && (
          <div className="adp show">{dupAlert}</div>
        )}

        {/* Datos del reservante */}
        <div className="sdv">Datos del reservante</div>
        <div className="fg" style={{ marginBottom: 14 }}>
          <div className="fgg">
            <label>Nombre del reservante</label>
            <input type="text" value={form.reservante} onChange={e => set('reservante', e.target.value)} placeholder="Ej: María González" />
          </div>
          <div className="fgg">
            <label>Teléfono de contacto</label>
            <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="Ej: 11 4523-8877" />
          </div>
          <div className="fgg">
            <label>Nombre del cumpleañero/a</label>
            <input type="text" value={form.cumple} onChange={e => set('cumple', e.target.value)} placeholder="Ej: Juanito" />
          </div>
          <div className="fgg">
            <label>Edad que cumple</label>
            <input type="number" value={form.edad} onChange={e => set('edad', e.target.value)} min={1} max={18} placeholder="Ej: 6" />
          </div>
        </div>

        {/* Datos del evento */}
        <div className="sdv">Datos del evento</div>
        <div className="fg" style={{ marginBottom: 14 }}>
          <div className="fgg">
            <label>Fecha</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </div>
          <div className="fgg" style={{ gridColumn: '1/-1' }}>
            <label>Horario</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--mu)', fontWeight: 700, minWidth: 38 }}>Desde</span>
              <select value={form.horaH} onChange={e => set('horaH', e.target.value)} style={{ flex: 1, minWidth: 60 }}>
                <option value="">HH</option>
                {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span style={{ color: 'var(--mu)', fontWeight: 700 }}>:</span>
              <select value={form.horaM} onChange={e => set('horaM', e.target.value)} style={{ flex: 1, minWidth: 60 }}>
                {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input
                type="text"
                value={form.horaLibre}
                onChange={e => set('horaLibre', e.target.value)}
                placeholder="o escribí HH:MM"
                style={{ flex: 1.4, fontSize: 13, minWidth: 100 }}
                title="También podés escribir la hora manualmente, ej: 14:30"
              />
              {getHora(form) && (
                <>
                  <span style={{ fontSize: 12, color: 'var(--mu)', fontWeight: 700, minWidth: 28 }}>Hasta</span>
                  <span style={{
                    padding: '7px 14px', borderRadius: 8,
                    background: 'var(--bg2, #f0f0f0)', fontWeight: 700,
                    fontSize: 15, color: 'var(--nv)', border: '1.5px solid var(--bd2)',
                    minWidth: 64, textAlign: 'center'
                  }}>
                    {addMinutesToHora(getHora(form), 150 + (form.extendido ? (form.extendido_mins || 30) : 0))}
                  </span>
                </>
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => set('extendido', !form.extendido)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '7px 18px', borderRadius: 22,
                    border: `1.5px solid ${form.extendido ? 'var(--nv)' : 'var(--bd2)'}`,
                    background: form.extendido ? 'var(--nv3)' : 'var(--wh)',
                    color: form.extendido ? 'var(--nv)' : 'var(--mu)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    fontFamily: "'Nunito', sans-serif", transition: 'all .2s',
                  }}
                >
                  <span>⏱</span>
                  <span>{form.extendido ? 'Extendido' : 'Extendido'}</span>
                </button>
                {form.extendido && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[30, 60, 90, 120].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => set('extendido_mins', mins)}
                        style={{
                          padding: '5px 12px', borderRadius: 18, fontSize: 12, fontWeight: 700,
                          border: `1.5px solid ${form.extendido_mins === mins ? 'var(--nv)' : 'var(--bd2)'}`,
                          background: form.extendido_mins === mins ? 'var(--nv3)' : 'var(--wh)',
                          color: form.extendido_mins === mins ? 'var(--nv)' : 'var(--mu)',
                          cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                        }}
                      >
                        {mins < 60 ? `+${mins} min` : `+${mins / 60} hs`}
                      </button>
                    ))}
                  </div>
                )}
                <span style={{ fontSize: 12, color: 'var(--mu)' }}>
                  {form.extendido
                    ? `+${form.extendido_mins || 30} min · duración total: ${Math.floor((150 + (form.extendido_mins || 30)) / 60)}:${String((150 + (form.extendido_mins || 30)) % 60).padStart(2, '0')} hs`
                    : 'Duración estándar: 2:30 hs'}
                </span>
              </div>
            </div>
          </div>
          <div className="fgg">
            <label>Salón</label>
            <select value={form.salon} onChange={e => set('salon', e.target.value)}>
              <option value="">Seleccionar...</option>
              {config.salones.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="fgg">
            <label>Tipo de evento</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="saltos">Saltos</option>
              <option value="parque">Parque aéreo</option>
              <option value="saltos+parque">Saltos + Parque aéreo</option>
            </select>
          </div>
          <div className="fgg">
            <label>Cantidad de chicos</label>
            <input type="number" value={form.chi} min={0} onChange={e => set('chi', e.target.value)} />
          </div>
          <div className="fgg">
            <label>Cantidad de adultos</label>
            <input type="number" value={form.adu} min={0} onChange={e => set('adu', e.target.value)} />
          </div>
          <div className="fgg" style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5, fontFamily: "'Nunito', sans-serif" }}>
                Evento privado
              </label>
              <button
                type="button"
                onClick={() => set('privado', !form.privado)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 22,
                  border: `1.5px solid ${form.privado ? 'var(--nv)' : 'var(--bd2)'}`,
                  background: form.privado ? 'var(--nv3)' : 'var(--wh)',
                  color: form.privado ? 'var(--nv)' : 'var(--mu)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  fontFamily: "'Nunito', sans-serif", transition: 'all .2s',
                }}
              >
                <span style={{ fontSize: 16 }}>{form.privado ? '🔒' : '🔓'}</span>
                <span>{form.privado ? 'Evento privado' : 'Abierto al público'}</span>
              </button>
            </div>
            <div style={{ flex: 2, minWidth: 200 }} className="fgg">
              <label>Observaciones</label>
              <textarea
                value={form.obs}
                onChange={e => set('obs', e.target.value)}
                placeholder="Alergias, pedidos especiales, decoración, referencias del festejado..."
                style={{ minHeight: 52 }}
              />
            </div>
          </div>
        </div>

        {/* Menús */}
        <div className="sdv">Menús por chico</div>
        <div className="mrc">
          {mrows.map(r => (
            <div key={r.rid} className="mr">
              <select
                value={r.mid}
                onChange={e => updateMRow(r.rid, 'mid', e.target.value)}
              >
                <option value="">Seleccionar menú...</option>
                {config.menus.map(m => (
                  <option key={m.id} value={String(m.id)}>{m.n}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={r.qty}
                onChange={e => updateMRow(r.rid, 'qty', e.target.value)}
                placeholder="Cant."
              />
              <button className="bdng" style={{ padding: '5px 10px' }} onClick={() => removeMRow(r.rid)}>✕</button>
            </div>
          ))}
        </div>
        <button className="bg2 bsm" style={{ marginTop: 10 }} onClick={addMRow}>+ Agregar fila de menú</button>

        {menuAlert && (
          <div className="adp show" style={{ marginTop: 10 }}>{menuAlert}</div>
        )}

        {/* Artículos del evento */}
        <div className="sdv">Artículos del evento</div>
        <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Productos del catálogo incluidos en el precio del evento (ej: bebidas, souvenirs). El stock se descuenta al inicio del evento.
        </div>
        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            type="text"
            value={artBusca}
            onChange={e => setArtBusca(e.target.value)}
            placeholder="Buscar producto por nombre..."
            style={{ width: '100%', border: '1px solid var(--bd2)', borderRadius: 10, padding: '9px 13px', fontSize: 13 }}
          />
          {artBusca.trim().length > 0 && (() => {
            const q = artBusca.toLowerCase()
            const filtrados = productos.filter(p => p.activo !== false && (p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q))).slice(0, 6)
            return filtrados.length > 0 ? (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: 'var(--wh)', border: '1px solid var(--bd2)', borderRadius: 10, boxShadow: 'var(--sh2)', marginTop: 4, overflow: 'hidden' }}>
                {filtrados.map(p => (
                  <div key={p.id}
                    onMouseDown={e => {
                      e.preventDefault()
                      setArticulosEvento(prev => {
                        const existe = prev.find(a => a.producto_id === p.id)
                        if (existe) return prev.map(a => a.producto_id === p.id ? { ...a, qty: a.qty + 1 } : a)
                        return [...prev, { rid: Date.now() + Math.random(), producto_id: p.id, nombre: p.nombre, qty: 1, precio: p.precio_venta || 0 }]
                      })
                      setArtBusca('')
                    }}
                    style={{ padding: '9px 13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bd)', fontSize: 13 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--nv3)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                    <span style={{ color: 'var(--gn)', fontWeight: 700 }}>{fmt(p.precio_venta || 0)}</span>
                  </div>
                ))}
              </div>
            ) : null
          })()}
        </div>
        {/* Lista de artículos */}
        {articulosEvento.length > 0 && (
          <div className="mrc">
            {articulosEvento.map(a => (
              <div key={a.rid} className="mr">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--nv)', flex: 2 }}>{a.nombre}</div>
                <input
                  type="number" min={0} step="0.01" value={a.precio}
                  onChange={e => setArticulosEvento(prev => prev.map(x => x.rid === a.rid ? { ...x, precio: parseFloat(e.target.value) || 0 } : x))}
                  style={{ width: 90, textAlign: 'right' }}
                  title="Precio unitario"
                />
                <input
                  type="number" min={1} step="1" value={a.qty}
                  onChange={e => setArticulosEvento(prev => prev.map(x => x.rid === a.rid ? { ...x, qty: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                  style={{ width: 70, textAlign: 'center' }}
                />
                <div className="mrp">{fmt(a.precio * a.qty)}</div>
                <button className="bdng" style={{ padding: '5px 10px' }} onClick={() => setArticulosEvento(prev => prev.filter(x => x.rid !== a.rid))}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Promoción e Interés */}
        <div className="sdv">Promoción / Interés</div>
        <div className="fg" style={{ marginBottom: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="fgg" style={{ flex: 1, minWidth: 180 }}>
            <label>Seleccionar promoción</label>
            <select value={form.promoId} onChange={e => set('promoId', e.target.value)}>
              <option value="">Sin promoción</option>
              {config.promos.map(p => (
                <option key={p.id} value={String(p.id)}>{p.d} ({p.pct}%)</option>
              ))}
            </select>
          </div>
          <div className="fgg" style={{ minWidth: 180 }}>
            <label>Interés tarjeta</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`bsm${form.interesTipo === 'pct' ? ' bg2' : ''}`}
                style={{ padding: '4px 8px', fontSize: 13, opacity: form.interesTipo === 'pct' ? 1 : 0.5 }}
                onClick={() => { set('interesTipo', 'pct'); set('interes', 0) }}
              >%</button>
              <button
                type="button"
                className={`bsm${form.interesTipo === 'fijo' ? ' bg2' : ''}`}
                style={{ padding: '4px 8px', fontSize: 13, opacity: form.interesTipo === 'fijo' ? 1 : 0.5 }}
                onClick={() => { set('interesTipo', 'fijo'); set('interes', 0) }}
              >$</button>
              {form.interesTipo === 'pct' && [0, 10, 15, 20, 25].map(v => (
                <button
                  key={v}
                  type="button"
                  className={`bsm${parseFloat(form.interes) === v ? ' bg2' : ''}`}
                  style={{ padding: '4px 8px', fontSize: 13, opacity: parseFloat(form.interes) === v ? 1 : 0.6 }}
                  onClick={() => set('interes', v)}
                >
                  {v === 0 ? 'Sin' : `${v}%`}
                </button>
              ))}
              <input
                type="number"
                min={0}
                step={form.interesTipo === 'pct' ? 1 : 100}
                value={form.interes || ''}
                onChange={e => set('interes', parseFloat(e.target.value) || 0)}
                placeholder={form.interesTipo === 'pct' ? '%' : '$'}
                style={{ width: 75, textAlign: 'center' }}
              />
            </div>
          </div>
        </div>

        {/* Estado de pago */}
        <div className="sdv">Estado del pago</div>
        <div className="popt">
          {['none', 'sena', 'paid', 'cancelado'].map(v => {
            const labels = { none: '✗ Sin pago', sena: '◑ Dejó seña', paid: '✓ Pagado completo', cancelado: '✕ Cancelado' }
            const isActive = form.pago === v
            return (
              <div
                key={v}
                className={`rp${isActive ? ` s${v}` : ''}`}
                onClick={() => {
                  set('pago', v)
                  // Al seleccionar 'paid' por primera vez, auto-completar monto con el total
                  if (v === 'paid' && !esEdicionPagada && !esEdicionSena && (parseFloat(form.monto) || 0) === 0) {
                    set('monto', calc.total)
                  }
                }}
              >
                {labels[v]}
              </div>
            )
          })}
        </div>

        {form.pago !== 'none' && form.pago !== 'cancelado' && (
          <div>
            <div className="fg" style={{ marginBottom: 10 }}>
              {!multiMet && !esEdicionPagada && !esEdicionSena && (
                <div className="fgg">
                  <label>Monto abonado / seña ($)</label>
                  <input type="number" min={0} value={form.monto} onChange={e => set('monto', e.target.value)} />
                </div>
              )}
              {esEdicionSena && form.pago === 'paid' && (() => {
                const saldo = Math.max(0, calc.total - yaCobrado)
                return (
                  <div className="fgg" style={{ gridColumn: '1/-1' }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: 'var(--nv3)', border: '1.5px solid var(--nv)', borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nv)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Ya cobrado como seña</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--nv)' }}>{fmt(yaCobrado)}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: saldo > 0 ? 'var(--gn)' : 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                          {saldo > 0 ? 'Saldo a cobrar ahora' : 'Sin cobro adicional'}
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: saldo > 0 ? 'var(--gn)' : 'var(--mu)' }}>
                          {saldo > 0 ? `+${fmt(saldo)}` : fmt(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
              {esEdicionSena && form.pago === 'sena' && (
                <div className="fgg" style={{ gridColumn: '1/-1' }}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: 'var(--nv3)', border: '1.5px solid var(--nv)', borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nv)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Ya cobrado como seña</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--nv)' }}>{fmt(yaCobrado)}</div>
                    </div>
                    {!multiMet && (
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gn)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Seña adicional a cobrar ahora</div>
                        <input
                          type="number" min={0}
                          value={adicionalSena || ''}
                          onChange={e => setAdicionalSena(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          style={{ width: '100%', fontSize: 15, fontWeight: 700 }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {esEdicionPagada && form.pago === 'paid' && (() => {
                const adicional = Math.max(0, calc.total - yaCobrado)
                return (
                  <div className="fgg" style={{ gridColumn: '1/-1' }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: 'var(--nv3)', border: '1.5px solid var(--nv)', borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nv)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Ya cobrado</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--nv)' }}>{fmt(yaCobrado)}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: adicional > 0 ? 'var(--gn)' : 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                          {adicional > 0 ? 'Cobro adicional ahora' : 'Sin cobro adicional'}
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: adicional > 0 ? 'var(--gn)' : 'var(--mu)' }}>
                          {adicional > 0 ? `+${fmt(adicional)}` : fmt(0)}
                        </div>
                      </div>
                    </div>
                    {adicional < 0 && (
                      <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 6 }}>
                        El nuevo total es menor al cobrado anteriormente. No se genera cobro adicional.
                      </div>
                    )}
                  </div>
                )
              })()}
              <div className="fgg" style={{ gridColumn: multiMet ? '1/-1' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Método de pago</label>
                  <button
                    type="button"
                    onClick={toggleMultiMet}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      border: `1.5px solid ${multiMet ? 'var(--nv)' : 'var(--bd2)'}`,
                      background: multiMet ? 'var(--nv3)' : 'transparent',
                      color: multiMet ? 'var(--nv)' : 'var(--mu)',
                      cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    {multiMet ? '✓ Múltiple' : '+ Más de un método'}
                  </button>
                </div>
                {!multiMet ? (
                  <select value={form.met} onChange={e => set('met', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {config.mets.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {metsPagados.map(mp => (
                      <div key={mp.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                          value={mp.met}
                          onChange={e => updateMetPagado(mp.id, 'met', e.target.value)}
                          style={{ flex: 1, border: '1px solid var(--bd2)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}
                        >
                          {config.mets.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={mp.monto}
                          onChange={e => updateMetPagado(mp.id, 'monto', e.target.value)}
                          placeholder="Monto $"
                          style={{ width: 120, border: '1px solid var(--bd2)', borderRadius: 8, padding: '7px 10px', fontSize: 13, textAlign: 'right' }}
                        />
                        {metsPagados.length > 1 && (
                          <button className="bdng" style={{ padding: '5px 8px' }} onClick={() => removeMetPagado(mp.id)}>✕</button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="bg2 bsm" onClick={addMetPagado} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                      + Agregar método
                    </button>
                    {esEdicionPagada && form.pago === 'paid' && (
                      <div style={{ fontSize: 12, color: 'var(--am)', fontWeight: 600, padding: '4px 0' }}>
                        ⚠ Ingresá solo el monto adicional a cobrar ahora por cada método (no el total acumulado).
                      </div>
                    )}
                    {esEdicionSena && form.pago === 'sena' && (
                      <div style={{ fontSize: 12, color: 'var(--am)', fontWeight: 600, padding: '4px 0' }}>
                        ⚠ Ingresá solo el monto adicional de seña a cobrar ahora por cada método (ya cobrado: {fmt(yaCobrado)}).
                      </div>
                    )}
                    {esEdicionSena && form.pago === 'paid' && (
                      <div style={{ fontSize: 12, color: 'var(--am)', fontWeight: 600, padding: '4px 0' }}>
                        ⚠ Ingresá el saldo restante a cobrar ahora por cada método (ya cobrado como seña: {fmt(yaCobrado)}).
                      </div>
                    )}
                    {(() => {
                      const cubierto = metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0)
                      const esAdicional = (esEdicionPagada && form.pago === 'paid') || (esEdicionSena && (form.pago === 'sena' || form.pago === 'paid'))
                      return cubierto > 0 && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--nv)', padding: '6px 0' }}>
                          {esAdicional ? `Cobro adicional: ${fmt(cubierto)}` : `Total abonado: ${fmt(cubierto)}`}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Selector de caja */}
            <div className="fgg" style={{ marginTop: 10 }}>
              <label>Acreditar en caja <span style={{ color: 'var(--rd)', fontWeight: 800 }}>*</span></label>
              <select value={cajaId || ''} onChange={e => setCajaId(Number(e.target.value) || null)}
                style={{ border: `1.5px solid ${!cajaId ? 'var(--am)' : 'var(--bd2)'}`, borderRadius: 10, padding: '9px 13px', fontSize: 13, background: 'var(--bg)', color: 'var(--tx)', width: '100%' }}>
                {cajasAbiertas.length === 0
                  ? <option value="">⚠ Sin cajas abiertas</option>
                  : <>
                      <option value="">— Seleccioná una caja —</option>
                      {cajasAbiertas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.turno ? ` — ${c.turno}` : ''}</option>)}
                    </>
                }
              </select>
              {cajasAbiertas.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--am)', marginTop: 4 }}>Abrí una caja primero para registrar el cobro.</div>
              )}
            </div>
          </div>
        )}

        {/* Extras */}
        <div className="sdv">Extras</div>
        <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Podés modificar el precio unitario para este evento puntualmente.
        </div>
        <div className="mrc">
          {config.extras.map(ex => {
            const qty = extraQtys[String(ex.id)] || 0
            const customP = extraPrices[String(ex.id)]
            const price = customP !== undefined ? customP : ex.p
            const sub = price * qty
            return (
              <div key={ex.id} className="mr">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--nv)', flex: 2 }}>{ex.n}</div>
                <input
                  type="number"
                  min={0}
                  value={customP !== undefined ? customP : ex.p}
                  onChange={e => setExtraPrice(ex.id, e.target.value)}
                  style={{ width: 90, textAlign: 'right' }}
                  title="Precio unitario (editable para este evento)"
                />
                <input
                  type="number"
                  min={0}
                  value={qty}
                  onChange={e => setExtraQty(ex.id, e.target.value)}
                  style={{ width: 70, textAlign: 'center' }}
                  placeholder="Cant."
                />
                <div className="mrp">{sub > 0 ? fmt(sub) : '$0'}</div>
              </div>
            )
          })}
        </div>

        {/* Extras ad-hoc (puntuales para este evento) */}
        {adHocExtras.length > 0 && (
          <div className="mrc" style={{ marginTop: 8 }}>
            {adHocExtras.map(r => {
              const sub = (parseFloat(r.p) || 0) * (parseInt(r.qty) || 0)
              return (
                <div key={r.rid} className="mr">
                  <input
                    type="text"
                    value={r.desc}
                    onChange={e => updateAdHoc(r.rid, 'desc', e.target.value)}
                    placeholder="Descripción del extra..."
                    style={{ flex: 2 }}
                  />
                  <input
                    type="number"
                    min={0}
                    value={r.p}
                    onChange={e => updateAdHoc(r.rid, 'p', e.target.value)}
                    placeholder="$ precio"
                    style={{ width: 90, textAlign: 'right' }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={r.qty}
                    onChange={e => updateAdHoc(r.rid, 'qty', e.target.value)}
                    placeholder="Cant."
                    style={{ width: 70, textAlign: 'center' }}
                  />
                  <div className="mrp">{sub > 0 ? fmt(sub) : '$0'}</div>
                  <button className="bdng" style={{ padding: '5px 10px' }} onClick={() => removeAdHoc(r.rid)}>✕</button>
                </div>
              )
            })}
          </div>
        )}
        <button className="bg2 bsm" style={{ marginTop: 8 }} onClick={addAdHoc}>+ Extra puntual para este evento</button>

        {/* Total box */}
        <div className="tb">
          <div className="tr"><span className="tl">Precio base ({parseInt(form.chi)||0} chicos × {fmt(pChicoEv)}{(parseInt(form.adu)||0) > 0 ? ` + ${parseInt(form.adu)||0} adultos × ${fmt(pAdultoEv)}` : ''})</span><span className="tv">{fmt(calc.base)}</span></div>
          {calc.mTot > 0 && (
            <div className="tr"><span className="tl">Menús</span><span className="tv">{fmt(calc.mTot)}</span></div>
          )}
          {calc.artTot > 0 && (
            <div className="tr"><span className="tl">Artículos</span><span className="tv">{fmt(calc.artTot)}</span></div>
          )}
          {calc.eTot > 0 && (
            <div className="tr"><span className="tl">Extras</span><span className="tv">{fmt(calc.eTot)}</span></div>
          )}
          {calc.dto > 0 && (
            <div className="tr">
              <span className="tl">Descuento por promoción</span>
              <span className="tv" style={{ color: 'var(--or2)' }}>-{fmt(calc.dto)}</span>
            </div>
          )}
          <hr className="tsep" />
          <div className="tr big"><span className="tl">Total del evento</span><span className="tv">{fmt(calc.total)}</span></div>
          {form.pago !== 'none' && (
            <>
              {(esEdicionPagada || esEdicionSena) && form.pago === 'paid' ? (
                <>
                  <div className="tr"><span className="tl">Ya cobrado{esEdicionSena ? ' como seña' : ''}</span><span className="tv">{fmt(yaCobrado)}</span></div>
                  {calc.total > yaCobrado && (
                    <div className="tr">
                      <span className="tl" style={{ color: 'rgba(255,255,255,0.75)' }}>Saldo a cobrar ahora</span>
                      <span className="tv" style={{ color: '#FFD166', fontSize: 18 }}>+{fmt(calc.total - yaCobrado)}</span>
                    </div>
                  )}
                  {calc.interes > 0 && (
                    <div className="tr">
                      <span className="tl">Interés tarjeta{calc.intTipo === 'pct' ? ` (${calc.intVal}%)` : ''}</span>
                      <span className="tv" style={{ color: '#FFD166' }}>+{fmt(calc.interes)}</span>
                    </div>
                  )}
                  {calc.interes > 0 && calc.total > yaCobrado && (
                    <div className="tr">
                      <span className="tl" style={{ fontWeight: 700 }}>Total a cobrar ahora</span>
                      <span className="tv" style={{ color: '#FFD166', fontSize: 18 }}>{fmt(calc.total - yaCobrado + calc.interes)}</span>
                    </div>
                  )}
                </>
              ) : esEdicionSena && form.pago === 'sena' ? (
                <>
                  <div className="tr"><span className="tl">Ya cobrado como seña</span><span className="tv">{fmt(yaCobrado)}</span></div>
                  {(() => {
                    const extra = multiMet
                      ? metsPagados.reduce((s, m) => s + (parseFloat(m.monto) || 0), 0)
                      : adicionalSena
                    return (
                      <>
                        {extra > 0 && (
                          <div className="tr">
                            <span className="tl" style={{ color: 'rgba(255,255,255,0.75)' }}>Seña adicional ahora</span>
                            <span className="tv" style={{ color: '#FFD166', fontSize: 18 }}>+{fmt(extra)}</span>
                          </div>
                        )}
                        {calc.interes > 0 && (
                          <div className="tr">
                            <span className="tl">Interés tarjeta{calc.intTipo === 'pct' ? ` (${calc.intVal}%)` : ''}</span>
                            <span className="tv" style={{ color: '#FFD166' }}>+{fmt(calc.interes)}</span>
                          </div>
                        )}
                        {extra > 0 && calc.interes > 0 && (
                          <div className="tr">
                            <span className="tl" style={{ fontWeight: 700 }}>Total a cobrar ahora</span>
                            <span className="tv" style={{ color: '#FFD166', fontSize: 18 }}>{fmt(extra + calc.interes)}</span>
                          </div>
                        )}
                      </>
                    )
                  })()}
                  <div className="tr">
                    <span className="tl" style={{ color: 'rgba(255,255,255,0.75)' }}>Restante a cobrar</span>
                    <span className="tv" style={{ color: '#FFD166', fontSize: 18 }}>{fmt(Math.max(0, calc.total - yaCobrado - (multiMet ? metsPagados.reduce((s,m)=>s+(parseFloat(m.monto)||0),0) : adicionalSena)))}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="tr"><span className="tl">Abonado / seña</span><span className="tv">{fmt(calc.monto)}</span></div>
                  {calc.interes > 0 && (
                    <div className="tr">
                      <span className="tl">Interés tarjeta{calc.intTipo === 'pct' ? ` (${calc.intVal}%)` : ''}</span>
                      <span className="tv" style={{ color: '#FFD166' }}>+{fmt(calc.interes)}</span>
                    </div>
                  )}
                  {calc.interes > 0 && (
                    <div className="tr">
                      <span className="tl" style={{ fontWeight: 700 }}>Total a abonar</span>
                      <span className="tv" style={{ color: '#FFD166', fontSize: 18 }}>{fmt(calc.monto + calc.interes)}</span>
                    </div>
                  )}
                  <div className="tr">
                    <span className="tl" style={{ color: 'rgba(255,255,255,0.75)' }}>Restante a cobrar</span>
                    <span className="tv" style={{ color: '#FFD166', fontSize: 18 }}>{fmt(calc.rest)}</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="bg2" onClick={onClose}>Cancelar</button>
          <button className="bp" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar evento'}
          </button>
        </div>
      </div>
    </div>
  )
}
