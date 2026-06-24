# BEX CRM — Deploy a Azure App Service

**Tiempo estimado: 25–30 minutos** para tener la app corriendo en producción.

Estrategia: **Next.js standalone + GitHub Actions + Azure App Service Linux + Azure PostgreSQL Flexible Server**

---

## Arquitectura del deploy

```
GitHub (push a main)
       ↓
GitHub Actions
  ├── npm ci
  ├── prisma generate + next build
  ├── prisma migrate deploy → Azure PostgreSQL
  └── deploy .next/standalone → Azure App Service
                                      ↕
                          Azure Database for PostgreSQL
                             (Flexible Server B1ms)
```

---

## Pre-requisitos

- Azure CLI instalado y autenticado (`az login`)
- GitHub repo creado para el proyecto
- Node.js 20 local para desarrollo

---

## PASO 1 — Ajustes en el proyecto (5 min)

Antes de crear recursos, haz estos 3 cambios en el código.

### 1.1 — `next.config.ts`

Agrega `output: 'standalone'`. Esto hace que el build genere una carpeta auto-contenida sin necesitar `npm install` en el servidor.

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

export default nextConfig
```

### 1.2 — `package.json` — scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "node server.js",
    "postinstall": "prisma generate"
  }
}
```

- `start` apunta a `server.js` (archivo que genera el standalone build)
- `postinstall` asegura que el cliente Prisma se genere al instalar deps

### 1.3 — `.gitignore` — verifica que esté ignorado

```
.next/
node_modules/
.env
.env.local
```

---

## PASO 2 — Crear recursos en Azure (10 min)

Copia y ejecuta este script completo. Cambia las variables al inicio.

```bash
#!/bin/bash

# ── CONFIGURA ESTAS VARIABLES ─────────────────────────────────────────
RESOURCE_GROUP="rg-bex-crm"
LOCATION="eastus"               # East US — coherente con infraestructura BEX existente
APP_NAME="bex-crm"              # Debe ser único globalmente en Azure
PLAN_NAME="plan-bex-crm"
DB_SERVER="bex-crm-db"         # Debe ser único globalmente en Azure
DB_NAME="bex_crm"
DB_USER="bexadmin"
DB_PASSWORD="BexCRM2024!Secure" # Cambia esto — mínimo 8 chars, mayus, minus, número, especial
# ──────────────────────────────────────────────────────────────────────

echo "→ Creando Resource Group..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

echo "→ Creando App Service Plan (B1 Linux)..."
az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

echo "→ Creando Web App (Node.js 20)..."
az webapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --runtime "NODE:20-lts"

echo "→ Creando PostgreSQL Flexible Server..."
az postgres flexible-server create \
  --name $DB_SERVER \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user $DB_USER \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --public-access None

echo "→ Creando base de datos..."
az postgres flexible-server db create \
  --server-name $DB_SERVER \
  --resource-group $RESOURCE_GROUP \
  --database-name $DB_NAME

echo "→ Habilitando acceso desde Azure services a PostgreSQL..."
az postgres flexible-server firewall-rule create \
  --name "AllowAzureServices" \
  --server-name $DB_SERVER \
  --resource-group $RESOURCE_GROUP \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

echo "→ Configurando variables de entorno en App Service..."
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV="production" \
    WEBSITES_PORT="3000" \
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_SERVER}.postgres.database.azure.com/${DB_NAME}?sslmode=require" \
    NEXTAUTH_URL="https://${APP_NAME}.azurewebsites.net" \
    AUTH_SECRET="$(openssl rand -base64 32)"

echo "→ Configurando startup command..."
az webapp config set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "node server.js"

echo ""
echo "✅ Recursos creados. URL: https://${APP_NAME}.azurewebsites.net"
echo ""
echo "⚠️  PENDIENTE: Agrega manualmente en App Service > Configuration:"
echo "   AUTH_MICROSOFT_ENTRA_ID_ID=<tu-client-id>"
echo "   AUTH_MICROSOFT_ENTRA_ID_SECRET=<tu-client-secret>"
echo "   AUTH_MICROSOFT_ENTRA_ID_TENANT_ID=<tu-tenant-id>"
```

**Nota:** `AUTH_MICROSOFT_ENTRA_ID_SECRET` es sensible — agrégala manualmente en el Portal (Azure App Service → Configuration → Application settings) para no exponerla en terminal.

---

## PASO 3 — Configurar App Registration en Entra ID (3 min)

En el App Registration que usas (o uno nuevo), agrega la URL de callback:

`https://bex-crm.azurewebsites.net/api/auth/callback/microsoft-entra-id`

En el Portal de Azure: **Entra ID → App Registrations → [tu app] → Authentication → Add a platform → Web → Redirect URI**

---

## PASO 4 — GitHub Actions — CI/CD (7 min)

### 4.1 — Obtener el Publish Profile

```bash
az webapp deployment list-publishing-profiles \
  --name bex-crm \
  --resource-group rg-bex-crm \
  --xml
```

Copia todo el XML que devuelve.

### 4.2 — Agregar Secrets en GitHub

En tu repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valor |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | El XML completo del paso anterior |
| `DATABASE_URL` | `postgresql://bexadmin:<password>@bex-crm-db.postgres.database.azure.com/bex_crm?sslmode=require` |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Client ID del App Registration |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Client Secret |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | Tenant ID de BEX |
| `AUTH_SECRET` | Mismo valor que pusiste en App Service |
| `NEXTAUTH_URL` | `https://bex-crm.azurewebsites.net` |

### 4.3 — Workflow file

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy BEX CRM

on:
  push:
    branches: [main]
  workflow_dispatch:     # permite trigger manual desde GitHub

env:
  AZURE_WEBAPP_NAME: bex-crm
  NODE_VERSION: "20"

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      # ── Checkout ──────────────────────────────────────────────────────
      - name: Checkout
        uses: actions/checkout@v4

      # ── Node.js setup ─────────────────────────────────────────────────
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      # ── Instalar deps ─────────────────────────────────────────────────
      - name: Install dependencies
        run: npm ci

      # ── Prisma: generar client y correr migraciones ───────────────────
      - name: Prisma generate
        run: npx prisma generate

      - name: Prisma migrate deploy
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      # ── Build Next.js ─────────────────────────────────────────────────
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
          AUTH_MICROSOFT_ENTRA_ID_ID: ${{ secrets.AUTH_MICROSOFT_ENTRA_ID_ID }}
          AUTH_MICROSOFT_ENTRA_ID_SECRET: ${{ secrets.AUTH_MICROSOFT_ENTRA_ID_SECRET }}
          AUTH_MICROSOFT_ENTRA_ID_TENANT_ID: ${{ secrets.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID }}
          NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}

      # ── Preparar paquete standalone ───────────────────────────────────
      # El standalone no incluye public/ ni .next/static/ — hay que copiarlos
      - name: Prepare standalone package
        run: |
          cp -r public .next/standalone/
          cp -r .next/static .next/standalone/.next/static

      # ── Deploy a Azure App Service ────────────────────────────────────
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .next/standalone
```

---

## PASO 5 — Primer deploy (2 min)

```bash
git add .
git commit -m "feat: deploy configuration"
git push origin main
```

Monitorea en GitHub: **Actions → Deploy BEX CRM** — verás los pasos en tiempo real.

Primera vez tarda ~3-4 min. Los siguientes ~2 min.

---

## Verificación post-deploy

```bash
# Ver logs en tiempo real
az webapp log tail \
  --name bex-crm \
  --resource-group rg-bex-crm

# Verificar que la app respondió 200
curl -I https://bex-crm.azurewebsites.net
```

Si ves `HTTP/2 200`, estás listo.

---

## Costos estimados (BRL → USD)

| Recurso | SKU | USD/mes aprox |
|---|---|---|
| App Service Plan | B1 Linux | ~$13 |
| PostgreSQL Flexible Server | B1ms Burstable | ~$12 |
| Storage (32GB) | — | ~$3 |
| **Total** | | **~$28/mes** |

Para dev/testing puedes usar F1 (Free) en App Service, pero **Free no tiene always-on** — la app se "duerme" después de 20 min inactiva. Para producción usa mínimo B1.

---

## Comandos útiles del día a día

```bash
# Ver logs de la app
az webapp log tail --name bex-crm --resource-group rg-bex-crm

# Reiniciar la app
az webapp restart --name bex-crm --resource-group rg-bex-crm

# Ver configuración actual
az webapp config appsettings list --name bex-crm --resource-group rg-bex-crm

# Actualizar una variable de entorno
az webapp config appsettings set \
  --name bex-crm \
  --resource-group rg-bex-crm \
  --settings MI_VARIABLE="nuevo-valor"

# Conectarse directo a la DB (desde tu máquina local)
# Primero agrega tu IP a la firewall de PostgreSQL:
az postgres flexible-server firewall-rule create \
  --name "MyLocalIP" \
  --server-name bex-crm-db \
  --resource-group rg-bex-crm \
  --start-ip-address $(curl -s ifconfig.me) \
  --end-ip-address $(curl -s ifconfig.me)

# Luego conectar con psql o cualquier cliente
psql "postgresql://bexadmin:<password>@bex-crm-db.postgres.database.azure.com/bex_crm?sslmode=require"
```

---

## Troubleshooting común

**Error: "Cannot find module 'server.js'"**
→ El startup command debe ser `node server.js`, no `npm start`. Verifica en App Service → Configuration → General settings → Startup Command.

**Error: "SSL connection required"**
→ Asegúrate que `DATABASE_URL` tenga `?sslmode=require` al final.

**Error: "P3006 Migration failed" en GitHub Actions**
→ El servidor PostgreSQL no permite conexiones desde GitHub Actions. Verifica que la regla de firewall `AllowAzureServices` (0.0.0.0 → 0.0.0.0) esté activa.

**App carga pero NextAuth falla (redirect error)**
→ Verifica que `NEXTAUTH_URL` en App Service coincida exactamente con la URL del App Registration en Entra ID (con `https://` y sin trailing slash).

**Build falla con "Environment variable not found"**
→ Algunas variables de NextAuth se necesitan en build time. Asegúrate de que todos los secrets de GitHub estén definidos en el step `Build` del workflow (ver paso 4.3).

---

## Integración con Microsoft Teams (Graph)

La pestaña **Reuniones (Teams)** de cada cliente lee, del calendario del CSM en sesión, las reuniones de Teams que cruzan con el cliente (por el dominio de correo de sus contactos). Funciona con permisos **app-only** de Microsoft Graph y queda **inerte hasta configurarse**: si faltan las variables, la pestaña muestra "pendiente de configurar" y no llama a Graph.

### 1. Permisos en el App Registration

Puedes reutilizar el App Registration del login o crear uno nuevo. En **Entra ID → App Registrations → [tu app] → API permissions → Add a permission → Microsoft Graph → Application permissions** (no delegadas), agrega **ambos**:

| Permiso (Application) | Para qué |
|---|---|
| **`Calendars.Read`** | Leer los calendarios y traer las reuniones de Teams |
| **`User.Read.All`** | Enumerar los buzones de BEXT (para escanear las reuniones de **todo** el equipo, no solo del usuario en sesión) |
| **`OnlineMeetings.Read.All`** | Resolver una reunión (joinUrl → onlineMeeting) — necesario para transcripción/notas |
| **`OnlineMeetingTranscript.Read.All`** | Leer la **transcripción** de la reunión (análisis IA de lo hablado) |
| **`OnlineMeetingAiInsight.Read.All`** | Leer las **notas IA de Copilot** de la reunión (resumen, action items) — *beta*, requiere que el organizador tenga licencia Copilot |

> Las 3 últimas son para la función de **análisis de reuniones (8b)**. Además de los permisos + consentimiento, el acceso app-only a transcripciones/grabaciones de un buzón requiere una **Application Access Policy de Teams** en PowerShell (Exchange/Teams): `New-CsApplicationAccessPolicy` + `Grant-CsApplicationAccessPolicy` para autorizar al App Registration sobre los buzones de BEXT. Sin esto, la pestaña Reuniones igual funciona (caché + lista), pero el botón "Analizar" devolverá un aviso de permiso faltante.

Luego **Grant admin consent** (botón en la misma pantalla) — requiere rol de administrador del tenant. Ambos permisos deben quedar con estado "Granted".

> `Calendars.Read` de aplicación permite leer el calendario de **cualquier** buzón del tenant. Para acotarlo a los buzones del equipo de BEXT, configura una **Application Access Policy** en Exchange Online (`New-ApplicationAccessPolicy`). El escaneo solo considera buzones cuyo dominio sea el de BEXT (configurable con `GRAPH_BEXT_DOMAIN`, default `bextsa.com`).

### 2. Client Secret

En **Certificates & secrets** genera (o reutiliza) un secret. Si usas el mismo App Registration del login, ya tienes uno.

### 3. Variables de entorno

Pega los datos del App Registration. Si dejas las `GRAPH_*` vacías, el código cae automáticamente a las credenciales del login (`AUTH_MICROSOFT_ENTRA_ID_*`) — en ese caso solo necesitas haber dado el consentimiento de `Calendars.Read` a esa misma app.

| Variable | Valor |
|---|---|
| `GRAPH_TENANT_ID` | Tenant ID de BEX (igual al de login) |
| `GRAPH_CLIENT_ID` | Client ID del App Registration |
| `GRAPH_CLIENT_SECRET` | Client Secret (sensible) |

En **local**: edítalas en `.env`. En **Azure**: agrégalas en App Service → Configuration → Application settings (el secret manualmente, no por terminal), y como secrets de GitHub Actions si las necesitas en build.

### 4. Cómo cruza las reuniones con el cliente

- Escanea los calendarios de **todos los buzones de BEXT** del tenant (no solo el del usuario en sesión) en la ventana de fechas elegida (default: último mes; con filtro Desde/Hasta en la UI).
- Una reunión "pertenece" al cliente si el **organizador o algún asistente** tiene un correo cuyo dominio coincide con el de los **contactos** del cliente (se ignoran dominios públicos como gmail/outlook.com).
- La misma reunión que aparece en varios calendarios se **deduplica** (por `iCalUId`) y se agrega quién de BEXT participó.
- Por eso, para que detecte reuniones, el cliente debe tener **contactos con correo corporativo** cargados. Sin contactos con correo, la pestaña lo avisa.
- El escaneo del tenant es costoso, así que se **cachea 5 minutos** por (cliente + rango de fechas).

---

*BEXTechnology S.A.S. — Deploy guide para BEX CRM v1*
