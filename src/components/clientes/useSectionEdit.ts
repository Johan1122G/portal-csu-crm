"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form"

// Maneja el toggle lectura/edición de una sección de la vista 360° y el guardado
// parcial vía PUT /api/clientes/[id] (solo los campos de esa sección).
export function useSectionEdit<T extends FieldValues>(accountId: string, defaults: T) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<T>({ defaultValues: defaults as DefaultValues<T> })

  const save = form.handleSubmit(async (data) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/clientes/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar")
        return
      }
      setEditing(false)
      router.refresh()
    } catch {
      setError("Error de red al guardar")
    } finally {
      setSaving(false)
    }
  })

  function cancel() {
    form.reset(defaults as DefaultValues<T>)
    setError(null)
    setEditing(false)
  }

  return { editing, setEditing, cancel, control: form.control, save, saving, error }
}
