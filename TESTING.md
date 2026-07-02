# Pruebas — Portal CSU

Estrategia en capas para que cada cambio/despliegue se verifique. Todo corre en
**local** contra un schema de base de datos dedicado (`test`) y sin credenciales
externas (GLPI/Graph/OpenAI quedan en modo "sin configurar" a propósito).

## Requisitos

- Docker Postgres arriba: `docker compose up -d`
- Dependencias instaladas: `npm install`
- (Playwright, una sola vez) navegador: `npx playwright install chromium`

## Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Vitest: lógica pura + motores (rápido, ~15s). Migra el schema `test` antes. |
| `npm run test:watch` | Vitest en modo watch. |
| `npm run test:e2e` | Playwright: smoke E2E en navegador (levanta el server de test en :3100). |
| `npm run test:e2e:ui` | Playwright en modo UI (depuración visual). |
| `npm run test:db` | Solo aplica migraciones al schema `test` (lo usan los anteriores). |

## Capas

### 1. Unit (Vitest) — `tests/unit/`
Funciones puras, sin DB ni red:
- `playbooks.test.ts` — integridad de las plantillas de playbook.
- `clientFields.test.ts` — coerción de valores del import CSV y placeholders.

### 2. Motores (Vitest) — `tests/engine/`
Corren contra el schema `test` con datos determinísticos (`tests/fixtures/seed.ts`):
- `health.test.ts` — Customer Health Score, incluido el caso **"gris"** (cliente con
  tickets pero sin señal de contexto → salud indeterminada, no rojo).
- `analytics.test.ts` — agregados (tickets, CSAT, categorización, SLA).
- `digest.test.ts` — clasificación en cubos (en riesgo, renovaciones, bolsas, sin contacto).

### 3. E2E (Playwright) — `tests/e2e/`
Navegador real, autenticado con el **bypass de dev** (sin Azure AD). `smoke.spec.ts`:
- Dashboard carga autenticado.
- Lista de clientes muestra los sembrados.
- **Ficha 360°: abre cada tab sin error** (atrapa los 500 de runtime como el de `jose`).
- Plan / Tareas: crear una tarea la muestra (flujo API completo).
- Digest carga y ubica al cliente en riesgo.
- QBR imprimible carga con su botón.

## Datos de prueba

`tests/fixtures/seed.ts` crea 3 clientes con desenlaces conocidos:
- **TEST-VERDE** → salud alta.
- **TEST-ROJO** → salud baja + renovación ≤30d + bolsa por agotarse + sin contacto.
- **TEST-GRIS** → tickets pero sin contexto → salud "gris" (sin datos).

Viven en el schema `test` (aislado de los datos reales en `public`). El seed se
ejecuta en el `beforeAll` de cada suite de motores y en el `global-setup` de E2E.

## Aislamiento

- **DB**: schema `test` (misma instancia Docker, distinto namespace).
- **Build**: el server E2E usa `.next-test` (no choca con tu `next dev` en :3000 que usa `.next`).
- **Puerto**: E2E corre en :3100.

## Notas

- Si `next dev` da `Cannot find module './vendor-chunks/jose.js'`, borra `.next` y
  reinicia — es caché corrupta por mezclar `build` y `dev`.
- CI (GitHub Actions) aún NO integrado: pendiente añadir un job que corra
  `npm test` + `npm run test:e2e` con un Postgres de servicio y bloquee el deploy.
