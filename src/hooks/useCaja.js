import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { fechaHoyAR } from '../utils'

export function useCaja() {
  const [cajasAbiertas, setCajasAbiertas] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCaja = useCallback(async () => {
    setLoading(true)
    const { data: abiertas } = await supabase
      .from('cajas')
      .select('*')
      .eq('estado', 'abierta')
      .order('created_at', { ascending: false })
    setCajasAbiertas(abiertas || [])

    const PAGE = 1000
    let allHist = []
    let page = 0
    while (true) {
      const { data, error } = await supabase
        .from('cajas')
        .select('*')
        .eq('estado', 'cerrada')
        .order('created_at', { ascending: false })
        .range(page * PAGE, (page + 1) * PAGE - 1)
      if (error) { console.warn('cajas hist:', error.message); break }
      allHist = allHist.concat(data || [])
      if (!data || data.length < PAGE) break
      page++
    }
    setHistorial(allHist)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCaja() }, [fetchCaja])

  const abrirCaja = async ({ saldo_inicial, nombre, turno, empleado_apertura }) => {
    const hora_apertura = new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false })
    const fecha = fechaHoyAR()
    const { data, error } = await supabase
      .from('cajas')
      .insert({ saldo_inicial, hora_apertura, fecha, estado: 'abierta', nombre: nombre || 'Caja', turno: turno || '', empleado_apertura: empleado_apertura || null })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setCajasAbiertas(prev => [data, ...prev])
    return data
  }

  const cerrarCaja = async ({ cajaId, saldo_final, obs_cierre, total_ventas, total_efectivo, empleado_cierre }) => {
    const hora_cierre = new Date().toTimeString().slice(0, 5)
    const { data, error } = await supabase
      .from('cajas')
      .update({ saldo_final, obs_cierre, hora_cierre, estado: 'cerrada', total_ventas, total_efectivo, empleado_cierre: empleado_cierre || null })
      .eq('id', cajaId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setCajasAbiertas(prev => prev.filter(c => c.id !== cajaId))
    setHistorial(prev => [data, ...prev])
    return data
  }

  return { cajasAbiertas, historial, loading, abrirCaja, cerrarCaja, fetchCaja }
}
