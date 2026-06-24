import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AppShell } from "@/components/layout/AppShell"

// Guarda de servidor para todo el grupo (dashboard). El middleware ya redirige,
// esto es una segunda barrera y nos da el `session.user` para el TopBar.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return <AppShell user={session.user}>{children}</AppShell>
}
