import NextAuth from "next-auth"
import type { Provider } from "next-auth/providers"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import Credentials from "next-auth/providers/credentials"

// Tenant ID → issuer URL. With a single-tenant issuer only BEXT accounts can sign in.
// (This beta of Auth.js takes `issuer`, not the older `tenantId` shorthand.)
const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID

// Dev-only bypass: lets you sign in without Azure AD while building locally.
// Gated by AUTH_DEV_BYPASS and hard-disabled in production, so it can never ship.
export const DEV_BYPASS_ENABLED =
  process.env.AUTH_DEV_BYPASS === "true" && process.env.NODE_ENV !== "production"

const providers: Provider[] = [
  MicrosoftEntraID({
    clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
    issuer: tenantId
      ? `https://login.microsoftonline.com/${tenantId}/v2.0`
      : undefined,
  }),
]

if (DEV_BYPASS_ENABLED) {
  providers.push(
    Credentials({
      id: "dev-bypass",
      name: "Desarrollo (local)",
      credentials: {},
      // No real check — returns a fixed local dev user. The email is configurable
      // (AUTH_DEV_BYPASS_EMAIL) so it can point to a real M365 mailbox and let the
      // Teams/Graph tab read that user's calendar while testing locally.
      authorize: () => ({
        id: "dev-user",
        name: "Dev BEXT",
        email: process.env.AUTH_DEV_BYPASS_EMAIL || "dev@bextsa.com",
      }),
    }),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Used by the middleware to gate every route.
    authorized({ auth }) {
      return !!auth?.user
    },
  },
})
