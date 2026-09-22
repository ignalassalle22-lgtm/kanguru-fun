import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export function useCofre() {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMovimientos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cofre_movimientos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.warn('cofre:', error.message)
    setMovimientos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMovimientos() }, [fetchMovimientos])

  const addMovimiento = async (mov) => {
    const { data, error } = await supabase
      .from('cofre_movimientos')
      .insert(mov)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setMovimientos(prev => [data, ...prev])
    return data
  }

  const saldo = movimientos.reduce((acc, m) =>
    m.tipo === 'ingreso' ? acc + (m.monto || 0) : acc - (m.monto || 0), 0)

  return { movimientos, loading, saldo, addMovimiento, fetchMovimientos }
}
