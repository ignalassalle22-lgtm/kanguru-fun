import { useState, useCallback } from 'react'
import { supabase } from '../supabase'

function diasEnMes(año, mes) { return new Date(año, mes, 0).getDate() }

export function useAsistencia() {
  const [asistencias, setAsistencias] = useState([])
  const [observaciones, setObservaciones] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchMes = useCallback(async (año, mes) => {
    setLoading(true)
    const desde = `${año}-${String(mes).padStart(2, '0')}-01`
    const hasta = `${año}-${String(mes).padStart(2, '0')}-31`
    const hasta2 = `${año}-${String(mes).padStart(2, '0')}-${String(diasEnMes(año, mes)).padStart(2, '0')}`
    const [asistRes, obsRes] = await Promise.all([
      supabase.from('asistencias').select('*').gte('fecha', desde).lte('fecha', hasta2),
      supabase.from('asistencia_obs').select('*').eq('año', año).eq('mes', mes),
    ])
    if (asistRes.error) console.error('Error fetch asistencias:', asistRes.error)
    if (obsRes.error) console.error('Error fetch obs:', obsRes.error)
    setAsistencias((asistRes.data || []).map(a => ({ ...a, empleado_id: Number(a.empleado_id) })))
    setObservaciones((obsRes.data || []).map(o => ({ ...o, empleado_id: Number(o.empleado_id) })))
    setLoading(false)
  }, [])

  // Guarda o elimina un registro de asistencia
  const saveAsistencia = useCallback(async (empleadoId, fecha, { hora_entrada, hora_salida, vacaciones }) => {
    const isEmpty = !hora_entrada && !hora_salida && !vacaciones
    const eId = Number(empleadoId)

    // Optimistic update
    setAsistencias(prev => {
      const existe = prev.find(a => Number(a.empleado_id) === eId && a.fecha === fecha)
      if (isEmpty) return prev.filter(a => !(Number(a.empleado_id) === eId && a.fecha === fecha))
      const nuevo = { empleado_id: eId, fecha, hora_entrada: hora_entrada || null, hora_salida: hora_salida || null, vacaciones: !!vacaciones }
      if (existe) return prev.map(a => Number(a.empleado_id) === eId && a.fecha === fecha ? { ...a, ...nuevo } : a)
      return [...prev, nuevo]
    })

    if (isEmpty) {
      const { error } = await supabase.from('asistencias').delete().eq('empleado_id', empleadoId).eq('fecha', fecha)
      if (error) console.error('Error eliminando asistencia:', error)
    } else {
      const { error } = await supabase.from('asistencias')
        .upsert({ empleado_id: empleadoId, fecha, hora_entrada: hora_entrada || null, hora_salida: hora_salida || null, vacaciones: !!vacaciones }, { onConflict: 'empleado_id,fecha' })
      if (error) console.error('Error guardando asistencia:', error)
    }
  }, [])

  const saveObs = useCallback(async (empleadoId, año, mes, obs) => {
    const eId = Number(empleadoId)
    setObservaciones(prev => {
      const existe = prev.find(o => Number(o.empleado_id) === eId && o.año === año && o.mes === mes)
      if (existe) return prev.map(o => Number(o.empleado_id) === eId && o.año === año && o.mes === mes ? { ...o, obs } : o)
      return [...prev, { empleado_id: eId, año, mes, obs }]
    })
    await supabase.from('asistencia_obs')
      .upsert({ empleado_id: empleadoId, año, mes, obs }, { onConflict: 'empleado_id,año,mes' })
  }, [])

  return { asistencias, observaciones, loading, fetchMes, saveAsistencia, saveObs }
}
