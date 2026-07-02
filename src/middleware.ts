export { auth as middleware } from "@/lib/auth"

// Protect every route except Next.js internals, the auth API and static assets.
// Unauthenticated requests are redirected to /login by the `authorized` callback.
// `api/analitica/sync` y `api/analitica/digest` quedan fuera para que un scheduler
// (Logic App) los invoque con su secreto — ambos endpoints exigen x-sync-secret o
// sesión, no son públicos.
export const config = {
  matcher: ["/((?!api/auth|api/analitica/sync|api/analitica/digest|_next/static|_next/image|favicon.ico|login).*)"],
}
