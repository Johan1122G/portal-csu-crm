import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

// Layout minimalista para reportes imprimibles (QBR): sin sidebar ni topbar, para
// que "Imprimir / Guardar como PDF" del navegador salga limpio. Mantiene la guarda
// de sesión (el FluentProvider viene del root layout).
export default async function ReportLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return <>{children}</>
}
