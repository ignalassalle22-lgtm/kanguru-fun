import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { DEFAULT_CONFIG } from '../utils'

export function useConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [configLoading, setConfigLoading] = useState(true)

  const fetchConfig = useCallback(async () => {
    const { data, error } = await supabase.from('configuracion').select('*')
    if (error) {
      console.warn('Supabase fetchConfig error:', error.message)
      setConfigLoading(false)
      return
    }
    if (data && data.length > 0) {
      const merged = { ...DEFAULT_CONFIG }
      data.forEach(row => {
        merged[row.clave] = row.valor
      })
      setConfig(merged)
    }
    setConfigLoading(false)
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Save a single config key to Supabase (upsert by clave)
  const saveConfig = async (clave, valor) => {
    const { data: existing } = await supabase
      .from('configuracion')
      .select('id')
      .eq('clave', clave)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('configuracion')
        .update({ valor })
        .eq('id', existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from('configuracion')
        .insert({ clave, valor })
      if (error) throw new Error(error.message)
    }
  }

  // Update config locally + persist to Supabase
  const updateConfig = async (clave, valor) => {
    setConfig(prev => ({ ...prev, [clave]: valor }))
    try {
      await saveConfig(clave, valor)
    } catch (e) {
      console.warn('Config save error:', e.message)
    }
  }

  return { config, setConfig, configLoading, updateConfig, saveConfig }
}
