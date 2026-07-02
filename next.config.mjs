/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build auto-contenido para Azure App Service (genera .next/standalone/server.js).
  // SOLO en build de producción: en `next dev` el modo standalone provoca errores
  // intermitentes "Cannot find module './vendor-chunks/*'" (jose/@auth) en rutas que
  // usan next-auth. Azure hace `next build` (NODE_ENV=production) → sí lo aplica.
  output: process.env.NODE_ENV === "development" ? undefined : "standalone",
  // Permite un directorio de build alterno (lo usa el server de pruebas E2E en
  // .next-test para no chocar con el `next dev` de desarrollo que usa .next).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // No bloquear el build de producción por warnings de ESLint (estilo/imports sin
  // usar). Los errores de TIPOS de TypeScript SÍ siguen bloqueando el build.
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
