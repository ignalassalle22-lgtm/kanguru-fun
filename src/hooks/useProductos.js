import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export function useProductos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: prods, error: e1 }, { data: cats, error: e2 }] = await Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('categorias').select('*').order('nombre'),
    ])
    if (e1) console.warn('productos:', e1.message)
    if (e2) console.warn('categorias:', e2.message)
    setProductos(prods || [])
    setCategorias(cats || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const saveProducto = async (p) => {
    const { created_at, ...payload } = p
    if (payload.id) {
      const { id, ...rest } = payload
      const { data, error } = await supabase.from('productos').update(rest).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      setProductos(prev => prev.map(x => x.id === id ? data : x))
      return data
    } else {
      const { id: _id, ...rest } = payload
      const { data, error } = await supabase.from('productos').insert(rest).select().single()
      if (error) throw new Error(error.message)
      setProductos(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      return data
    }
  }

  const deleteProducto = async (id) => {
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setProductos(prev => prev.filter(p => p.id !== id))
  }

  const updateStock = async (productoId, delta) => {
    const prod = productos.find(p => p.id === productoId)
    if (!prod) return
    const nuevo = Math.max(0, (prod.stock_actual || 0) + delta)
    const { error } = await supabase.from('productos').update({ stock_actual: nuevo }).eq('id', productoId)
    if (error) throw new Error(error.message)
    setProductos(prev => prev.map(p => p.id === productoId ? { ...p, stock_actual: nuevo } : p))
  }

  const updateCosto = async (productoId, nuevoCosto) => {
    const { error } = await supabase.from('productos').update({ precio_costo: nuevoCosto }).eq('id', productoId)
    if (error) throw new Error(error.message)
    setProductos(prev => prev.map(p => p.id === productoId ? { ...p, precio_costo: nuevoCosto } : p))
  }

  const bulkUpdatePrecios = async (updates) => {
    // updates: [{id, precio_venta, precio_costo?}]
    for (const u of updates) {
      const patch = {}
      if (u.precio_venta !== undefined) patch.precio_venta = u.precio_venta
      if (u.precio_costo !== undefined) patch.precio_costo = u.precio_costo
      await supabase.from('productos').update(patch).eq('id', u.id)
    }
    await fetchAll()
  }

  const saveCategoria = async (nombre) => {
    const { data, error } = await supabase.from('categorias').insert({ nombre }).select().single()
    if (error) throw new Error(error.message)
    setCategorias(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    return data
  }

  return { productos, categorias, loading, fetchAll, saveProducto, deleteProducto, updateStock, updateCosto, bulkUpdatePrecios, saveCategoria }
}
