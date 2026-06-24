"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

type CatalogMap = Record<string, string[]>

type CatalogCtx = {
  catalogs: CatalogMap
  refresh: () => Promise<void>
  loaded: boolean
}

const Ctx = createContext<CatalogCtx>({ catalogs: {}, refresh: async () => {}, loaded: false })

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalogs, setCatalogs] = useState<CatalogMap>({})
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogos")
      const json = await res.json()
      setCatalogs(json.data ?? {})
    } catch {
      // deja catálogos vacíos; los forms muestran sin opciones hasta reintentar
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return <Ctx.Provider value={{ catalogs, refresh, loaded }}>{children}</Ctx.Provider>
}

// Opciones activas de una lista (vacío mientras carga).
export function useCatalog(key: string): string[] {
  return useContext(Ctx).catalogs[key] ?? []
}

// Para refrescar tras editar catálogos (página de administración).
export function useCatalogRefresh(): () => Promise<void> {
  return useContext(Ctx).refresh
}
