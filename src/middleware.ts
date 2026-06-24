export { auth as middleware } from "@/lib/auth"

// Protect every route except Next.js internals, the auth API and static assets.
// Unauthenticated requests are redirected to /login by the `authorized` callback.
// `api/analitica/sync` queda fuera para que un scheduler (Logic App) lo invoque
// con su secreto — el propio endpoint exige x-sync-secret o sesión, no es público.
export const config = {
  matcher: ["/((?!api/auth|api/analitica/sync|_next/static|_next/image|favicon.ico|login).*)"],
}
