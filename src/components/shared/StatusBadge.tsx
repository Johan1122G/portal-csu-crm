"use client"

import { Badge } from "@fluentui/react-components"

type BadgeColor =
  | "brand"
  | "danger"
  | "important"
  | "informative"
  | "severe"
  | "subtle"
  | "success"
  | "warning"

// Mapea cualquiera de los estados de catálogo a un color de Badge de Fluent.
const COLOR_MAP: Record<string, BadgeColor> = {
  // Cliente
  Activo: "success",
  Inactivo: "subtle",
  Prospecto: "informative",
  "En riesgo": "danger",
  // Servicio
  Suspendido: "warning",
  Cancelado: "danger",
  "En renovación": "informative",
  // Actividad / Oportunidad
  Pendiente: "warning",
  "En proceso": "informative",
  Completada: "success",
  // Prioridad / Impacto
  Alta: "danger",
  Alto: "danger",
  Media: "warning",
  Medio: "warning",
  Baja: "subtle",
  Bajo: "subtle",
}

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return null
  return (
    <Badge appearance="filled" color={COLOR_MAP[value] ?? "subtle"}>
      {value}
    </Badge>
  )
}
