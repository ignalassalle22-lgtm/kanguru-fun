import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export function useCompras() {
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCompras = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('compras')
      .select('*, compra_items(*)')
      .order('created_at', { ascending: false })
    if (error) console.warn('compras:', error.message)
    setCompras(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCompras() }, [fetchCompras])

  const saveCompra = async (compra, items, updateStockFn, updateCostoFn) => {
    const { data: compraData, error: compraError } = await supabase
      .from('compras')
      .insert(compra)
      .select()
      .single()
    if (compraError) throw new Error(compraError.message)

    const itemsToInsert = items.map(it => ({
      compra_id: compraData.id,
      producto_id: it.producto_id,
      nombre_producto: it.nombre_producto,
      precio_unitario: it.precio_unitario,
      cantidad: it.cantidad,
      subtotal: it.subtotal,
    }))
    const { error: itemsError } = await supabase.from('compra_items').insert(itemsToInsert)
    if (itemsError) throw new Error(itemsError.message)

    for (const it of itemsToInsert) {
      if (it.producto_id) {
        if (updateStockFn) await updateStockFn(it.producto_id, it.cantidad)
        if (updateCostoFn && it.precio_unitario > 0) await updateCostoFn(it.producto_id, it.precio_unitario)
      }
    }

    const compraCompleta = { ...compraData, compra_items: itemsToInsert }
    setCompras(prev => [compraCompleta, ...prev])
    return compraCompleta
  }

  const updateCompra = async (compra, newItems, oldItems, updateStockFn, updateCostoFn) => {
    // 1. Revertir stock de ítems anteriores
    if (updateStockFn) {
      for (const it of oldItems) {
        if (it.producto_id) await updateStockFn(it.producto_id, -it.cantidad)
      }
    }

    // 2. Actualizar cabecera
    const { error: updError } = await supabase
      .from('compras')
      .update({
        proveedor: compra.proveedor,
        fecha: compra.fecha,
        numero_remito: compra.numero_remito,
        total: compra.total,
        metodo_pago: compra.metodo_pago,
        obs: compra.obs,
        iva: compra.iva || 0,
        retenciones: compra.retenciones || 0,
        impuestos: compra.impuestos || 0,
        otros_gastos: compra.otros_gastos || 0,
        descuento_tipo: compra.descuento_tipo || 'monto',
        descuento_valor: compra.descuento_valor || 0,
      })
      .eq('id', compra.id)
    if (updError) throw new Error(updError.message)

    // 3. Reemplazar ítems
    await supabase.from('compra_items').delete().eq('compra_id', compra.id)
    const itemsToInsert = newItems.map(it => ({
      compra_id: compra.id,
      producto_id: it.producto_id,
      nombre_producto: it.nombre_producto,
      precio_unitario: it.precio_unitario,
      cantidad: it.cantidad,
      subtotal: it.subtotal,
    }))
    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from('compra_items').insert(itemsToInsert)
      if (itemsError) throw new Error(itemsError.message)
    }

    // 4. Aplicar stock y costo de nuevos ítems
    for (const it of itemsToInsert) {
      if (it.producto_id) {
        if (updateStockFn) await updateStockFn(it.producto_id, it.cantidad)
        if (updateCostoFn && it.precio_unitario > 0) await updateCostoFn(it.producto_id, it.precio_unitario)
      }
    }

    const compraActualizada = { ...compra, compra_items: itemsToInsert }
    setCompras(prev => prev.map(c => c.id === compra.id ? compraActualizada : c))
    return compraActualizada
  }

  const anularCompra = async (id, items, updateStockFn) => {
    // Revertir stock
    if (updateStockFn) {
      for (const it of items) {
        if (it.producto_id) await updateStockFn(it.producto_id, -it.cantidad)
      }
    }
    const { error } = await supabase.from('compras').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setCompras(prev => prev.filter(c => c.id !== id))
  }

  return { compras, loading, fetchCompras, saveCompra, updateCompra, anularCompra }
}
