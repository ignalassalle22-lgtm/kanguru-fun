import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export function useProveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProveedores = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('nombre', { ascending: true })
    if (error) console.warn('proveedores:', error.message)
    setProveedores(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProveedores() }, [fetchProveedores])

  const saveProveedor = async (prov) => {
    if (prov.id) {
      const { data, error } = await supabase
        .from('proveedores')
        .update({ nombre: prov.nombre, cuit: prov.cuit, obs: prov.obs })
        .eq('id', prov.id)
        .select().single()
      if (error) throw new Error(error.message)
      setProveedores(prev => prev.map(p => p.id === prov.id ? data : p).sort((a, b) => a.nombre.localeCompare(b.nombre)))
      return data
    } else {
      const { data, error } = await supabase
        .from('proveedores')
        .insert({ nombre: prov.nombre, cuit: prov.cuit, obs: prov.obs })
        .select().single()
      if (error) throw new Error(error.message)
      setProveedores(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      return data
    }
  }

  const deleteProveedor = async (id) => {
    const { error } = await supabase.from('proveedores').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setProveedores(prev => prev.filter(p => p.id !== id))
  }

  return { proveedores, loading, saveProveedor, deleteProveedor }
}
