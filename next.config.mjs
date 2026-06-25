/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build auto-contenido para Azure App Service (genera .next/standalone/server.js).
  output: "standalone",
  // No bloquear el build de producción por warnings de ESLint (estilo/imports sin
  // usar). Los errores de TIPOS de TypeScript SÍ siguen bloqueando el build.
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
