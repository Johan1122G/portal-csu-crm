// ─── Cadencia de entregables ──────────────────────────────────────────────────────
// Lógica pura (sin DB): calcular el siguiente vencimiento según la frecuencia y
// clasificar el estado (vencido / próximo / al día). Sin imports de servidor.

import { addDays, addMonths } from "date-fns"

export type EstadoEntrega = "vencido" | "proximo" | "alDia" | "sinFecha" | "inactivo"

// Avanza una fecha según la frecuencia. "Única vez" no se repite (null).
export function siguienteFecha(desde: Date, frecuencia: string): Date | null {
  const f = frecuencia.toLowerCase()
  if (/semanal/.test(f)) return addDays(desde, 7)
  if (/quincenal/.test(f)) return addDays(desde, 15)
  if (/bimensual|bimestral/.test(f)) return addMonths(desde, 2)
  if (/trimestral/.test(f)) return addMonths(desde, 3)
  if (/semestral/.test(f)) return addMonths(desde, 6)
  if (/anual/.test(f)) return addMonths(desde, 12)
  if (/mensual/.test(f)) return addMonths(desde, 1)
  if (/única|unica|una vez/.test(f)) return null
  return addMonths(desde, 1) // default: mensual
}

// Días hasta el vencimiento (negativo = vencido). null si no hay fecha.
export function diasParaVencer(proximaEntrega: Date | null, ahora: Date): number | null {
  if (!proximaEntrega) return null
  return Math.ceil((proximaEntrega.getTime() - ahora.getTime()) / 86_400_000)
}

// Estado de un entregable frente a su ventana de notificación.
export function estadoEntrega(input: {
  activo: boolean
  proximaEntrega: Date | null
  notificarDiasAntes: number
  ahora: Date
}): EstadoEntrega {
  if (!input.activo) return "inactivo"
  const dias = diasParaVencer(input.proximaEntrega, input.ahora)
  if (dias == null) return "sinFecha"
  if (dias < 0) return "vencido"
  if (dias <= input.notificarDiasAntes) return "proximo"
  return "alDia"
}
