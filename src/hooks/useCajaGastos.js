import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export function useCajaGastos() {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGastos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('caja_gastos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.warn('caja_gastos:', error.message)
    setGastos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchGastos() }, [fetchGastos])

  const addGasto = async (gasto) => {
    const { data, error } = await supabase
      .from('caja_gastos')
      .insert(gasto)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setGastos(prev => [data, ...prev])
    return data
  }

  return { gastos, loading, addGasto, fetchGastos }
}
