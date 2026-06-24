import { redirect } from "next/navigation"
import { auth, DEV_BYPASS_ENABLED } from "@/lib/auth"
import { LoginCard } from "@/components/auth/LoginCard"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/")

  return <LoginCard devBypass={DEV_BYPASS_ENABLED} />
}
