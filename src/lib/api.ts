import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Guard común para las API routes: devuelve null si hay sesión, o una respuesta 401.
export async function requireSession() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export function serverError(error: unknown) {
  console.error("[api]", error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 })
}
