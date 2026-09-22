import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// Map Supabase snake_case -> camelCase
function fromDB(row) {
  if (!row) return row
  return {
    ...row,
    promoId: row.promo_id,
    interesTipo: row.interes_tipo,
    precioChico: row.precio_chico,
    precioAdulto: row.precio_adulto,
    menusStockAplicado: row.menus_stock_aplicado,
    consumosCobrados: row.consumos_cobrados,
  }
}

// Map camelCase -> Supabase snake_case
function toDB(ev) {
  const { promoId, interesTipo, precioChico, precioAdulto, menusStockAplicado, consumosCobrados, ...rest } = ev
  const row = { ...rest, promo_id: promoId || null, interes_tipo: interesTipo || 'pct' }
  if (precioChico !== undefined) row.precio_chico = precioChico
  if (precioAdulto !== undefined) row.precio_adulto = precioAdulto
  if (menusStockAplicado !== undefined) row.menus_stock_aplicado = menusStockAplicado
  if (consumosCobrados !== undefined) row.consumos_cobrados = consumosCobrados
  return row
}

export function useEventos() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEventos = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('fecha', { ascending: true })

    if (error) {
      console.warn('Supabase fetchEventos error:', error.message)
      setError(error.message)
      setLoading(false)
      return
    }
    setEventos((data || []).map(fromDB))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEventos()
  }, [fetchEventos])

  const saveEvento = async (ev) => {
    const dbRow = toDB(ev)

    if (ev.id) {
      const { data, error } = await supabase
        .from('eventos')
        .update(dbRow)
        .eq('id', ev.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      const updated = fromDB(data)
      setEventos(prev => prev.map(e => e.id === ev.id ? updated : e))
      return updated
    } else {
      const { id: _id, ...insertRow } = dbRow
      const { data, error } = await supabase
        .from('eventos')
        .insert(insertRow)
        .select()
        .single()
      if (error) throw new Error(error.message)
      const created = fromDB(data)
      setEventos(prev => [...prev, created])
      return created
    }
  }

  const deleteEvento = async (id) => {
    const { error } = await supabase.from('eventos').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setEventos(prev => prev.filter(e => e.id !== id))
  }

  // Guarda los consumos del evento y actualiza el estado local
  const saveEventoConsumos = async (eventoId, consumos) => {
    const { data, error } = await supabase
      .from('eventos')
      .update({ consumos })
      .eq('id', eventoId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const updated = fromDB(data)
    setEventos(prev => prev.map(e => e.id === eventoId ? updated : e))
    return updated
  }

  // Marca el stock de menús como aplicado
  const marcarMenusStockAplicado = async (eventoId) => {
    const { data, error } = await supabase
      .from('eventos')
      .update({ menus_stock_aplicado: true })
      .eq('id', eventoId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const updated = fromDB(data)
    setEventos(prev => prev.map(e => e.id === eventoId ? updated : e))
    return updated
  }

  // Marca los adicionales como cobrados
  const marcarConsumoCobrado = async (eventoId) => {
    const { data, error } = await supabase
      .from('eventos')
      .update({ consumos_cobrados: true })
      .eq('id', eventoId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const updated = fromDB(data)
    setEventos(prev => prev.map(e => e.id === eventoId ? updated : e))
    return updated
  }

  // Deshace el cobro de adicionales
  const resetConsumoCobrado = async (eventoId) => {
    const { data, error } = await supabase
      .from('eventos')
      .update({ consumos_cobrados: false })
      .eq('id', eventoId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const updated = fromDB(data)
    setEventos(prev => prev.map(e => e.id === eventoId ? updated : e))
    return updated
  }

  // Finaliza el evento: marca como pagado completo y consumos cobrados
  const finalizarEvento = async (eventoId, { monto, met }) => {
    const { data, error } = await supabase
      .from('eventos')
      .update({ pago: 'paid', monto, met, consumos_cobrados: true })
      .eq('id', eventoId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const updated = fromDB(data)
    setEventos(prev => prev.map(e => e.id === eventoId ? updated : e))
    return updated
  }

  // Deshace el descuento de stock de menús
  const resetMenusStockAplicado = async (eventoId) => {
    const { data, error } = await supabase
      .from('eventos')
      .update({ menus_stock_aplicado: false })
      .eq('id', eventoId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const updated = fromDB(data)
    setEventos(prev => prev.map(e => e.id === eventoId ? updated : e))
    return updated
  }

  return {
    eventos, setEventos, loading, error,
    fetchEventos, saveEvento, deleteEvento,
    saveEventoConsumos, marcarMenusStockAplicado, marcarConsumoCobrado,
    resetConsumoCobrado, resetMenusStockAplicado, finalizarEvento,
  }
}
