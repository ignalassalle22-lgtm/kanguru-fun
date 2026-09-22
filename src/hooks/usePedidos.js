import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'

export function usePedidos(onNuevoPedido) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const cbRef = useRef(onNuevoPedido)
  useEffect(() => { cbRef.current = onNuevoPedido })

  const fetchPedidos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, pedido_items(*)')
      .not('estado', 'eq', 'cobrado')
      .order('created_at', { ascending: true })
    setPedidos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPedidos() }, [fetchPedidos])

  // Realtime: escucha inserts y updates sin polling
  useEffect(() => {
    const channel = supabase
      .channel('pedidos-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, async (payload) => {
        const { data } = await supabase
          .from('pedidos').select('*, pedido_items(*)').eq('id', payload.new.id).single()
        if (data) {
          setPedidos(prev => [...prev, data])
          cbRef.current?.(data)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        const u = payload.new
        if (u.estado === 'cobrado') {
          setPedidos(prev => prev.filter(p => p.id !== u.id))
        } else {
          setPedidos(prev => prev.map(p => p.id === u.id ? { ...p, ...u } : p))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const updateEstado = async (id, estado) => {
    const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id)
    if (error) throw new Error(error.message)
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p))
  }

  const marcarCobrado = async (id, ventaId) => {
    const { error } = await supabase
      .from('pedidos').update({ estado: 'cobrado', venta_id: ventaId }).eq('id', id)
    if (error) throw new Error(error.message)
    setPedidos(prev => prev.filter(p => p.id !== id))
  }

  const anularPedido = async (id) => {
    const { error } = await supabase
      .from('pedidos').update({ estado: 'cancelado' }).eq('id', id)
    if (error) throw new Error(error.message)
    setPedidos(prev => prev.filter(p => p.id !== id))
  }

  return { pedidos, loading, fetchPedidos, updateEstado, marcarCobrado, anularPedido }
}
