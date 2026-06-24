"use client"

import { useState } from "react"
import { Button } from "@fluentui/react-components"
import { ArrowDownloadRegular } from "@fluentui/react-icons"

// Descarga un ZIP desde un endpoint protegido (cookies same-origin) vía blob,
// con manejo de error y estado de carga.
export function ExportButton({
  url,
  filename,
  label = "Exportar a D365",
  appearance = "secondary",
}: {
  url: string
  filename: string
  label?: string
  appearance?: "primary" | "secondary" | "outline" | "subtle" | "transparent"
}) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        alert("No se pudo generar el export.")
        return
      }
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = href
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch {
      alert("Error de red al exportar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button appearance={appearance} icon={<ArrowDownloadRegular />} onClick={download} disabled={loading}>
      {loading ? "Generando…" : label}
    </Button>
  )
}
