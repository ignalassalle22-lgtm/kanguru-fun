import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { fechaHoyAR } from '../utils'

export function useVentas() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPaginated = useCallback(async (desde, hasta) => {
    const PAGE = 1000
    let all = []
    let page = 0
    while (true) {
      let q = supabase.from('ventas').select('*, venta_items(*), cajas(id, nombre, turno)').order('created_at', { ascending: false })
      if (desde) q = q.gte('fecha', desde)
      if (hasta) q = q.lte('fecha', hasta)
      q = q.range(page * PAGE, (page + 1) * PAGE - 1)
      const { data, error } = await q
      if (error) { console.warn('ventas:', error.message); break }
      all = all.concat(data || [])
      if (!data || data.length < PAGE) break
      page++
    }
    return all
  }, [])

  const fetchVentas = useCallback(async () => {
    setLoading(true)
    // Carga rápida: ventas de hoy (para que Caja muestre tickets inmediatamente)
    const hoy = fechaHoyAR()
    const hoyData = await fetchPaginated(hoy, hoy)
    setVentas(hoyData)
    setLoading(false)
  }, [fetchPaginated])

  // Consulta independiente para filtros de fecha (no pisa el estado global)
  const fetchVentasRango = useCallback(async (desde, hasta) => {
    return await fetchPaginated(desde, hasta)
  }, [fetchPaginated])

  useEffect(() => { fetchVentas() }, [fetchVentas])

  const saveVenta = async (venta, items, updateStockFn) => {
    const { data: last } = await supabase
      .from('ventas')
      .select('numero')
      .like('numero', 'KF-%')
      .order('numero', { ascending: false })
      .limit(1)
    const nextNum = last?.length > 0
      ? (parseInt(last[0].numero.replace('KF-', '')) || 0) + 1
      : 1
    const numero = 'KF-' + String(nextNum).padStart(7, '0')

    const { data: ventaData, error: ventaError } = await supabase
      .from('ventas')
      .insert({ ...venta, numero })
      .select()
      .single()
    if (ventaError) throw new Error(ventaError.message)

    const itemsToInsert = items.map(it => ({
      venta_id: ventaData.id,
      producto_id: it.producto_id,
      nombre_producto: it.nombre_producto,
      precio_unitario: it.precio_unitario,
      cantidad: it.cantidad,
      subtotal: it.subtotal,
    }))
    const { error: itemsError } = await supabase.from('venta_items').insert(itemsToInsert)
    if (itemsError) throw new Error(itemsError.message)

    // Descontar stock (también para componentes de productos compuestos)
    for (const it of items) {
      if (it.producto_id && updateStockFn) {
        // Descontar stock del producto solo si maneja_stock
        if (it.maneja_stock !== false) {
          await updateStockFn(it.producto_id, -it.cantidad)
        }
        // Siempre descontar componentes (productos compuestos tienen maneja_stock=false pero sus componentes sí manejan stock)
        if (it.componentes && it.componentes.length > 0) {
          for (const comp of it.componentes) {
            if (comp.producto_id) await updateStockFn(comp.producto_id, -(comp.cantidad * it.cantidad))
          }
        }
      }
    }

    const ventaCompleta = { ...ventaData, venta_items: itemsToInsert }
    setVentas(prev => [ventaCompleta, ...prev])
    return ventaCompleta
  }

  const updateVenta = async (id, changes) => {
    const { error } = await supabase.from('ventas').update(changes).eq('id', id)
    if (error) throw new Error(error.message)
    setVentas(prev => prev.map(v => v.id === id ? { ...v, ...changes } : v))
  }

  const editarVenta = async (id, venta, newItems, updateStockFn, allProductos = []) => {
    // 1. Revertir stock viejo (producto + componentes)
    const { data: oldItems } = await supabase.from('venta_items').select('*').eq('venta_id', id)
    if (updateStockFn && oldItems) {
      for (const it of oldItems) {
        if (!it.producto_id) continue
        const prod = allProductos.find(p => p.id === it.producto_id)
        if (prod?.maneja_stock !== false) {
          await updateStockFn(it.producto_id, it.cantidad)
        }
        if (prod?.componentes?.length > 0) {
          for (const comp of prod.componentes) {
            if (comp.producto_id) await updateStockFn(comp.producto_id, comp.cantidad * it.cantidad)
          }
        }
      }
    }
    // 2. Actualizar registro principal
    const updateFields = {
      cliente: venta.cliente,
      metodo_pago: venta.metodo_pago,
      obs: venta.obs,
      subtotal: venta.subtotal,
      descuento: venta.descuento,
      total: venta.total,
    }
    if (venta.caja_id !== undefined) updateFields.caja_id = venta.caja_id
    if (venta.empleado_id !== undefined) updateFields.empleado_id = venta.empleado_id
    const { error: updError } = await supabase.from('ventas').update(updateFields).eq('id', id)
    if (updError) throw new Error(updError.message)
    // 3. Reemplazar items
    await supabase.from('venta_items').delete().eq('venta_id', id)
    const itemsToInsert = newItems.map(it => ({
      venta_id: id,
      producto_id: it.producto_id,
      nombre_producto: it.nombre_producto,
      precio_unitario: it.precio_unitario,
      cantidad: it.cantidad,
      subtotal: it.subtotal,
    }))
    if (itemsToInsert.length > 0) {
      const { error: ie } = await supabase.from('venta_items').insert(itemsToInsert)
      if (ie) throw new Error(ie.message)
    }
    // 4. Aplicar stock nuevo
    if (updateStockFn) {
      for (const it of newItems) {
        if (it.producto_id) {
          if (it.maneja_stock !== false) {
            await updateStockFn(it.producto_id, -it.cantidad)
          }
          if (it.componentes?.length > 0) {
            for (const comp of it.componentes) {
              if (comp.producto_id) await updateStockFn(comp.producto_id, -(comp.cantidad * it.cantidad))
            }
          }
        }
      }
    }
    const ventaActualizada = { ...venta, id, venta_items: itemsToInsert }
    setVentas(prev => prev.map(v => v.id === id ? ventaActualizada : v))
    return ventaActualizada
  }

  const anularVenta = async (id, updateStockFn, allProductos = []) => {
    const venta = ventas.find(v => v.id === id)
    if (!venta) return
    const { error } = await supabase.from('ventas').update({ estado: 'anulada' }).eq('id', id)
    if (error) throw new Error(error.message)
    // Revertir stock (producto + componentes)
    if (venta.venta_items && updateStockFn) {
      for (const it of venta.venta_items) {
        if (!it.producto_id) continue
        const prod = allProductos.find(p => p.id === it.producto_id)
        if (prod?.maneja_stock !== false) {
          await updateStockFn(it.producto_id, it.cantidad)
        }
        if (prod?.componentes?.length > 0) {
          for (const comp of prod.componentes) {
            if (comp.producto_id) await updateStockFn(comp.producto_id, comp.cantidad * it.cantidad)
          }
        }
      }
    }
    setVentas(prev => prev.map(v => v.id === id ? { ...v, estado: 'anulada' } : v))
  }

  const fetchVentasByCaja = useCallback(async (cajaId) => {
    const { data, error } = await supabase
      .from('ventas')
      .select('*, venta_items(*)')
      .eq('caja_id', cajaId)
      .order('created_at', { ascending: false })
    if (error) { console.warn('ventas caja:', error.message); return [] }
    return data || []
  }, [])

  return { ventas, loading, fetchVentas, fetchVentasRango, fetchVentasByCaja, saveVenta, anularVenta, updateVenta, editarVenta }
}
