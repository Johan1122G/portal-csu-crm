# BEX CRM — Instrucciones para Claude Code

## Contexto del proyecto

BEXTechnology S.A.S. necesita un mini CRM transitorio orientado a **Customer Success y Soporte**, basado en la "Hoja de Vida 360° del Cliente". En ~3 meses se migrará a **Dynamics 365 Customer Service**, por lo que:

1. El schema de base de datos debe **espejear los nombres lógicos de Dataverse/D365 CS** para que el export sea limpio.
2. La UI debe basarse en **Fluent UI v9** (@fluentui/react-components), el mismo design system que usa Dynamics 365.
3. La app es **standalone** — no es parte del BEX Portal existente.

---

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 14.x |
| Lenguaje | TypeScript | 5.x |
| UI | @fluentui/react-components | 9.x |
| ORM | Prisma | 5.x |
| Base de datos | PostgreSQL | 15+ |
| Auth | NextAuth.js v5 (authjs) + Azure AD (Entra ID) | 5.x |
| Deploy | Azure App Service | — |

**Paquetes adicionales:**
- `@fluentui/icons-react` — iconos
- `papaparse` — generación de CSV para export
- `date-fns` — manejo de fechas
- `zod` — validación de formularios
- `react-hook-form` — manejo de formularios

---

## Configuración inicial del proyecto

```bash
npx create-next-app@latest bex-crm \
  --typescript \
  --app \
  --no-tailwind \
  --src-dir \
  --import-alias "@/*"

cd bex-crm

npm install @fluentui/react-components @fluentui/icons-react
npm install prisma @prisma/client
npm install next-auth@beta
npm install zod react-hook-form @hookform/resolvers
npm install papaparse @types/papaparse
npm install date-fns

npx prisma init
```

---

## Variables de entorno (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/bex_crm"

# NextAuth + Azure AD (Entra ID)
AUTH_SECRET="genera-con-openssl-rand-base64-32"
AUTH_MICROSOFT_ENTRA_ID_ID="<CLIENT_ID>"
AUTH_MICROSOFT_ENTRA_ID_SECRET="<CLIENT_SECRET>"
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID="<TENANT_ID>"

NEXTAUTH_URL="http://localhost:3000"
```

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Shell principal con nav lateral Fluent UI
│   │   ├── page.tsx                ← Dashboard con KPIs
│   │   ├── clientes/
│   │   │   ├── page.tsx            ← DataGrid de clientes
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx        ← Formulario nuevo cliente (wizard por secciones)
│   │   │   └── [id]/
│   │   │       ├── page.tsx        ← Vista 360° con Pivot (tabs)
│   │   │       └── editar/
│   │   │           └── page.tsx
│   │   ├── actividades/
│   │   │   └── page.tsx            ← Repositorio de gestiones CS
│   │   └── oportunidades/
│   │       └── page.tsx            ← Oportunidades y recomendaciones
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts
│   │   ├── clientes/
│   │   │   ├── route.ts            ← GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts        ← GET one, PUT update, DELETE
│   │   │       └── export/
│   │   │           └── route.ts    ← Export cliente a CSV D365
│   │   ├── contactos/
│   │   │   └── route.ts
│   │   ├── relacionamiento/
│   │   │   └── route.ts
│   │   ├── productos/
│   │   │   └── route.ts
│   │   ├── actividades/
│   │   │   └── route.ts
│   │   └── oportunidades/
│   │       └── route.ts
│   ├── globals.css
│   └── layout.tsx                  ← FluentProvider wrapper
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── clientes/
│   │   ├── ClienteGrid.tsx
│   │   ├── ClienteForm.tsx
│   │   └── tabs/
│   │       ├── InfoGeneralTab.tsx
│   │       ├── ContactosTab.tsx
│   │       ├── RelacionamientoTab.tsx
│   │       ├── ConocimientoTab.tsx
│   │       ├── SoporteCSTab.tsx
│   │       ├── ProductosTab.tsx
│   │       ├── ActividadesTab.tsx
│   │       └── OportunidadesTab.tsx
│   └── shared/
│       ├── StatusBadge.tsx
│       ├── ExportButton.tsx
│       └── PageHeader.tsx
├── lib/
│   ├── prisma.ts                   ← Singleton Prisma client
│   ├── auth.ts                     ← NextAuth config
│   └── export/
│       ├── d365-mapper.ts          ← Mapeo a schemas D365 CS
│       └── csv-generator.ts        ← Generador CSV
├── types/
│   └── index.ts
└── prisma/
    └── schema.prisma
```

---

## Schema Prisma completo

**Archivo: `prisma/schema.prisma`**

Los nombres de campos siguen los nombres lógicos de Dataverse para facilitar el export a D365 CS.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ACCOUNT (D365: account) ─────────────────────────────────────────────────
model Account {
  id        String   @id @default(cuid())
  
  // Sección 1 — Información General
  // D365 field names as comments for export mapping
  name                  String              // D365: name
  accountnumber         String    @unique   // D365: accountnumber (NIT)
  cr_bex_estadocliente  String    @default("Activo")  // D365: custom — Activo | Inactivo | Prospecto | En riesgo
  industrycode          String?             // D365: industrycode
  address1_city         String?             // D365: address1_city
  address1_country      String    @default("Colombia") // D365: address1_country
  cr_bex_tamanoempresa  String?             // D365: custom — Micro | Pequeña | Mediana | Grande | Enterprise
  websiteurl            String?             // D365: websiteurl
  cr_bex_primernegocio  DateTime?           // D365: custom

  // Sección 4 — Conocimiento del Cliente
  cr_bex_principalesretos       String?     // D365: custom (text)
  cr_bex_principalesdolores     String?
  cr_bex_objetivosestrategicos  String?
  cr_bex_expectativasbext       String?
  cr_bex_riesgosidentificados   String?
  cr_bex_oportunidades          String?

  // Sección 5 — Soporte
  cr_bex_tienebolsahoras        Boolean   @default(false)
  cr_bex_horascontratadas       Int?
  cr_bex_horasconsumidas        Int?
  cr_bex_nivelsatisfaccion      Int?      // 0-10
  cr_bex_principalessolicitudes String?

  // Sección 5 — Customer Success
  cr_bex_niveladopcion            String?   // Bajo | Medio | Alto | Óptimo
  cr_bex_clienteestrategico       Boolean   @default(false)
  cr_bex_casoexito                Boolean   @default(false)
  cr_bex_potencialcrecimiento     String?   // Bajo | Medio | Alto
  cr_bex_acompanamientoprioritario Boolean  @default(false)
  cr_bex_comentarioscs            String?

  // Sección 6 — Observaciones Generales
  description           String?             // D365: description

  // Timestamps
  createdon   DateTime  @default(now())     // D365: createdon
  modifiedon  DateTime  @updatedAt          // D365: modifiedon

  // Relations
  contacts          Contact[]
  relationships     BextRelationship[]
  products          ProductService[]
  activities        CSActivity[]
  opportunities     OpportunityRecommendation[]

  @@map("accounts")
}

// ─── CONTACT (D365: contact) ──────────────────────────────────────────────────
model Contact {
  id          String    @id @default(cuid())
  accountId   String
  account     Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)

  cr_bex_tipocontacto   String    // Principal | Ejecutivo | Técnico | Operativo | Financiero | Otro
  fullname              String    // D365: fullname
  jobtitle              String?   // D365: jobtitle
  telephone1            String?   // D365: telephone1
  emailaddress1         String    // D365: emailaddress1

  createdon   DateTime  @default(now())
  modifiedon  DateTime  @updatedAt

  @@map("contacts")
}

// ─── BEXT RELATIONSHIP (D365: connection / systemuser relation) ───────────────
// Mapea las personas de BEX que atienden al cliente (Ejecutivo Comercial, GP, Líder Técnico)
model BextRelationship {
  id          String    @id @default(cuid())
  accountId   String
  account     Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)

  cr_bex_rolbext              String    // Ejecutivo Comercial | Gerente de Proyecto | Líder Técnico
  cr_bex_nombrepersona        String
  cr_bex_frecuenciacontacto   String?   // Diaria | Semanal | Quincenal | Mensual | Trimestral
  cr_bex_nivelrelacionamiento String?   // Operativo | Táctico | Estratégico
  cr_bex_ultimareunion        DateTime?
  cr_bex_proximareunion       DateTime?
  cr_bex_motivoultimocontacto String?

  createdon   DateTime  @default(now())
  modifiedon  DateTime  @updatedAt

  @@map("bext_relationships")
}

// ─── PRODUCT SERVICE (D365: contract / contractdetail) ───────────────────────
model ProductService {
  id          String    @id @default(cuid())
  accountId   String
  account     Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)

  title                     String    // Razón Social Cliente (denormalizado para export)
  cr_bex_lineanegocio       String?   // Managed Services | Cloud | Seguridad | Desarrollo | Licenciamiento
  cr_bex_productoservicio   String
  statecode                 String    @default("Activo") // D365: statecode — Activo | Suspendido | Cancelado | En renovación
  activeon                  DateTime? // D365: activeon (fecha inicio)
  expireson                 DateTime? // D365: expireson (fecha renovación)
  cr_bex_responsablebext    String?
  cr_bex_observaciones      String?

  createdon   DateTime  @default(now())
  modifiedon  DateTime  @updatedAt

  @@map("product_services")
}

// ─── CS ACTIVITY (D365: activitypointer — phonecall, email, appointment, task) ─
model CSActivity {
  id          String    @id @default(cuid())
  accountId   String
  account     Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)

  scheduledstart          DateTime  // D365: scheduledstart (Fecha Gestión)
  cr_bex_tipogestion      String    // Llamada | Encuesta | Entrevista | Correo | Reunión | Hallazgo | Oportunidad | Recomendación
  cr_bex_responsablecs    String?
  cr_bex_contactocliente  String?
  cr_bex_canal            String?   // Teléfono | Email | Teams | Presencial | WhatsApp
  subject                 String?   // D365: subject (Tema / Motivo)
  description             String?   // D365: description (Hallazgo / Voz del Cliente)
  cr_bex_oportunidad      String?   // Oportunidad / Recomendación
  cr_bex_areaescalar      String?   // Comercial | Técnico | Soporte | Dirección
  statecode               String    @default("Completada") // Pendiente | En proceso | Completada | Cancelada

  createdon   DateTime  @default(now())
  modifiedon  DateTime  @updatedAt

  @@map("cs_activities")
}

// ─── OPPORTUNITY / RECOMMENDATION (D365: opportunity — simplified) ────────────
model OpportunityRecommendation {
  id          String    @id @default(cuid())
  accountId   String
  account     Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)

  createdon               DateTime  @default(now()) // D365: createdon
  cr_bex_origen           String    @default("Gestión CS") // Gestión CS | Reunión | Encuesta | Soporte | Otro
  name                    String    // D365: name (Descripción)
  cr_bex_tipo             String?   // Comercial | Operativa | Producto | Soporte | Escalamiento
  cr_bex_impacto          String?   // Alto | Medio | Bajo
  prioritycode            String?   // D365: prioritycode — Alta | Media | Baja
  cr_bex_responsable      String?   // Responsable / Director
  cr_bex_accionrequerida  String?
  estimatedclosedate      DateTime? // D365: estimatedclosedate (Fecha Compromiso)
  statecode               String    @default("Pendiente") // Pendiente | En proceso | Completada | Cancelada

  modifiedon  DateTime  @updatedAt

  @@map("opportunities")
}
```

---

## Configuración Auth (NextAuth v5 + Azure AD)

**`src/lib/auth.ts`**

```typescript
import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user
    },
  },
})
```

**`src/app/api/auth/[...nextauth]/route.ts`**
```typescript
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

**`src/app/(dashboard)/layout.tsx`** — protege todas las rutas del dashboard con `auth()`.

---

## Fluent UI v9 — Setup en root layout

**`src/app/layout.tsx`**

```tsx
"use client"
import { FluentProvider, webLightTheme } from "@fluentui/react-components"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <FluentProvider theme={webLightTheme}>
          {children}
        </FluentProvider>
      </body>
    </html>
  )
}
```

---

## Páginas y sus responsabilidades

### 1. Dashboard `/` (page.tsx en (dashboard))

KPIs en Cards (Fluent UI `Card`):
- Total de clientes activos
- Clientes estratégicos
- Oportunidades pendientes
- Próximas reuniones (esta semana)
- Horas de soporte consumidas vs. contratadas (agregado)

Debajo: tabla resumen de últimas 5 actividades CS y próximas 5 reuniones.

### 2. Clientes `/clientes`

`DataGrid` de Fluent UI con columnas:
- Razón Social | NIT | Estado | Industria | Ciudad | Ejecutivo Comercial | Estratégico | Satisfacción | Acciones

Filtros en `Toolbar`: Estado, Industria, Estratégico, búsqueda por nombre.

Botón "+ Nuevo cliente" en toolbar.
Botón "Exportar todo a D365" que descarga ZIP con todos los CSVs.

### 3. Vista 360° del cliente `/clientes/[id]`

Layout con `Pivot` (tabs) de Fluent UI — exactamente como D365 CS:

| Tab | Contenido |
|---|---|
| **Información General** | Sección 1 del Excel en form de solo lectura con botón Editar |
| **Contactos** | Tabla de contactos (Sección 2) con tipo, nombre, cargo, teléfono, correo |
| **Relacionamiento** | Cards por cada persona BEX (Sección 3): nombre, rol, frecuencia, próxima reunión |
| **Conocimiento** | Campos de texto largo en 2 columnas (Sección 4) |
| **Soporte / CS** | Dos columnas: métricas Soporte a la izquierda, métricas CS a la derecha (Sección 5) |
| **Productos** | DataGrid de productos/servicios contratados (Sección 7) |
| **Gestiones CS** | DataGrid de actividades con filtro por tipo (Sección 8) |
| **Oportunidades** | DataGrid de oportunidades con prioridad y estado (Sección 9) |

Header del cliente (siempre visible sobre los tabs): Razón Social, Estado badge, Estratégico badge, Industria, Ciudad.

### 4. Formulario nuevo/editar cliente

Wizard de 3 pasos con `Stepper` visual:
- **Paso 1**: Información General + Contactos (Secciones 1 y 2)
- **Paso 2**: Relacionamiento BEXT + Conocimiento del Cliente (Secciones 3 y 4)
- **Paso 3**: Soporte / CS + Observaciones (Secciones 5 y 6)

Validación con `zod` + `react-hook-form`. Campos requeridos marcados con *.

### 5. Actividades `/actividades`

Vista global de todas las gestiones CS de todos los clientes.
DataGrid con filtro por tipo, responsable CS, rango de fechas, área a escalar.
Botón "+ Registrar gestión" con `Dialog` de Fluent UI.

### 6. Oportunidades `/oportunidades`

Vista global de todas las oportunidades y recomendaciones.
DataGrid con filtro por tipo, impacto, prioridad, estado.
Botón "+ Nueva oportunidad" con `Dialog`.

---

## Lógica de Export a D365 CS

**`src/lib/export/d365-mapper.ts`**

El export genera múltiples archivos CSV, uno por entidad D365, listos para el **Data Import Wizard** de Dynamics 365.

### Archivos generados por cliente:

| Archivo | Entidad D365 | Campos clave |
|---|---|---|
| `accounts.csv` | account | name, accountnumber, cr_bex_estadocliente, industrycode, address1_city, address1_country, websiteurl, description |
| `contacts.csv` | contact | fullname, jobtitle, telephone1, emailaddress1, cr_bex_tipocontacto, parentcustomerid (→ account.name lookup) |
| `activities.csv` | activitypointer | subject, scheduledstart, statecode, regardingobjectid (→ account lookup), cr_bex_tipogestion |
| `opportunities.csv` | opportunity | name, createdon, prioritycode, statecode, estimatedclosedate, customerid (→ account lookup) |
| `contracts.csv` | contract | title, activeon, expireson, statecode, customerid (→ account lookup) |

**Implementación:**

```typescript
// d365-mapper.ts
export function mapAccountToD365(account: AccountWithRelations) {
  return {
    name: account.name,
    accountnumber: account.accountnumber,
    // ... todos los campos con el nombre lógico D365
  }
}

export function mapContactToD365(contact: Contact, accountName: string) {
  return {
    fullname: contact.fullname,
    jobtitle: contact.jobtitle ?? "",
    telephone1: contact.telephone1 ?? "",
    emailaddress1: contact.emailaddress1,
    "parentcustomerid(account)": accountName, // lookup por nombre para el wizard
    cr_bex_tipocontacto: contact.cr_bex_tipocontacto,
  }
}
// ... mappers para cada entidad
```

```typescript
// csv-generator.ts
import Papa from "papaparse"

export function generateD365CsvBundle(account: AccountWithRelations): Record<string, string> {
  return {
    "accounts.csv": Papa.unparse([mapAccountToD365(account)]),
    "contacts.csv": Papa.unparse(account.contacts.map(c => mapContactToD365(c, account.name))),
    "activities.csv": Papa.unparse(account.activities.map(a => mapActivityToD365(a, account.name))),
    "opportunities.csv": Papa.unparse(account.opportunities.map(o => mapOpportunityToD365(o, account.name))),
    "contracts.csv": Papa.unparse(account.products.map(p => mapContractToD365(p, account.name))),
  }
}
```

El endpoint `GET /api/clientes/[id]/export` devuelve un ZIP usando el paquete nativo `JSZip` con los CSVs dentro.

---

## Catálogos / Dropdowns

Centraliza todos los valores de selección en `src/lib/constants.ts`:

```typescript
export const ESTADOS_CLIENTE = ["Activo", "Inactivo", "Prospecto", "En riesgo"]
export const INDUSTRIAS = ["Educación", "Salud", "Financiero", "Gobierno", "Manufactura", "Retail", "Tecnología", "Energía", "Construcción", "Otro"]
export const TAMANOS_EMPRESA = ["Micro (1-10)", "Pequeña (11-50)", "Mediana (51-200)", "Grande (201-1000)", "Enterprise (+1000)"]
export const FRECUENCIAS_CONTACTO = ["Diaria", "Semanal", "Quincenal", "Mensual", "Trimestral"]
export const NIVELES_RELACIONAMIENTO = ["Operativo", "Táctico", "Estratégico"]
export const ROLES_BEXT = ["Ejecutivo Comercial", "Gerente de Proyecto", "Líder Técnico"]
export const TIPOS_GESTION = ["Llamada", "Encuesta", "Entrevista", "Correo", "Reunión", "Hallazgo", "Oportunidad", "Recomendación"]
export const CANALES = ["Teléfono", "Email", "Teams", "Presencial", "WhatsApp"]
export const AREAS_ESCALAR = ["Comercial", "Técnico", "Soporte", "Dirección", "No aplica"]
export const NIVELES_ADOPCION = ["Bajo", "Medio", "Alto", "Óptimo"]
export const POTENCIAL_CRECIMIENTO = ["Bajo", "Medio", "Alto"]
export const TIPOS_OPORTUNIDAD = ["Comercial", "Operativa", "Producto", "Soporte", "Escalamiento"]
export const IMPACTOS = ["Alto", "Medio", "Bajo"]
export const PRIORIDADES = ["Alta", "Media", "Baja"]
export const ESTADOS_OPORTUNIDAD = ["Pendiente", "En proceso", "Completada", "Cancelada"]
export const ESTADOS_SERVICIO = ["Activo", "Suspendido", "Cancelado", "En renovación"]
export const LINEAS_NEGOCIO = ["Managed Services", "Cloud", "Seguridad", "Desarrollo", "Licenciamiento", "Consultoría"]
export const TIPOS_CONTACTO = ["Principal", "Ejecutivo", "Técnico", "Operativo", "Financiero", "Otro"]
```

---

## Prisma Client Singleton

**`src/lib/prisma.ts`**

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["query"] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

---

## Guías de UI (Fluent UI v9)

### Paleta de color BEX sobre Fluent UI

El color primario de BEX es `#8b2727` (rojo oscuro). Crea un tema personalizado:

```typescript
// src/lib/theme.ts
import { createDarkTheme, createLightTheme, BrandVariants } from "@fluentui/react-components"

const bexBrand: BrandVariants = {
  10: "#1a0505", 20: "#2e0909", 30: "#430e0e",
  40: "#5a1313", 50: "#721818", 60: "#8b2727",
  70: "#a33535", 80: "#bb4545", 90: "#d05858",
  100: "#e47070", 110: "#ee8e8e", 120: "#f5aaaa",
  130: "#f9c4c4", 140: "#fcdcdc", 150: "#feeaea",
  160: "#fff4f4",
}

export const bexLightTheme = createLightTheme(bexBrand)
export const bexDarkTheme = createDarkTheme(bexBrand)
```

Usa `bexLightTheme` en `FluentProvider`.

### Patrones de componentes clave

**StatusBadge para estados de cliente:**
```tsx
import { Badge } from "@fluentui/react-components"

const colorMap = {
  "Activo": "success",
  "Inactivo": "subtle",
  "Prospecto": "informative",
  "En riesgo": "danger",
}
```

**Sidebar con NavigationMenu:**
Usa `NavDrawer` + `NavItem` de Fluent UI v9. Items:
- 🏠 Dashboard
- 👥 Clientes
- 📋 Gestiones CS
- 💡 Oportunidades

**DataGrid con acciones:**
Usa el componente `DataGrid` de `@fluentui/react-components` con:
- `DataGridHeader` + `DataGridBody`
- `TableCellActions` para editar/eliminar/exportar por fila
- Paginación con `Pagination` o carga inicial de máximo 50 registros

---

## API Routes — Patrones

Todas las rutas API deben:
1. Verificar sesión con `auth()` de NextAuth — retornar 401 si no hay sesión
2. Usar `try/catch` con respuestas de error consistentes
3. Validar body con `zod` antes de interactuar con Prisma

```typescript
// Patrón base
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  try {
    // lógica...
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### Endpoints requeridos

**GET /api/clientes** — lista paginada con filtros (query params: estado, industria, estrategico, search, page, limit)

**POST /api/clientes** — crea Account + Contacts + BextRelationships en una transacción

**GET /api/clientes/[id]** — include all relations:
```typescript
prisma.account.findUnique({
  where: { id },
  include: {
    contacts: true,
    relationships: true,
    products: true,
    activities: { orderBy: { scheduledstart: "desc" } },
    opportunities: { orderBy: { createdon: "desc" } },
  },
})
```

**PUT /api/clientes/[id]** — update con upsert en relaciones

**DELETE /api/clientes/[id]** — soft delete (cambiar estadocliente a "Inactivo") en lugar de borrar

**GET /api/clientes/[id]/export** — genera ZIP con CSVs D365

---

## Orden de implementación recomendado

1. **Setup base**: inicializar proyecto, instalar deps, configurar Prisma + DB, auth Azure AD
2. **Schema y migraciones**: `npx prisma migrate dev --name init`
3. **AppShell**: layout con Sidebar + TopBar en Fluent UI
4. **CRUD Clientes**: API routes + página de lista + formulario
5. **Vista 360°**: página con Pivot tabs, comenzar por Info General y Contactos
6. **Módulo Gestiones CS**: API + página global + tab en vista 360°
7. **Módulo Oportunidades**: API + página global + tab en vista 360°
8. **Dashboard**: KPIs con queries de agregación en Prisma
9. **Export D365**: mappers + generador CSV + endpoint ZIP
10. **Polish**: estados vacíos, loaders, manejo de errores, responsividad

---

## Notas críticas

- **Nunca hardcodear datos**: todos los dropdowns provienen de `constants.ts`, fácil de actualizar
- **El campo `accountnumber` es el NIT**: es único e inmutable una vez creado
- **Horas de soporte**: `cr_bex_horasconsumidas` se incrementa manualmente — no hay integración automática con GLPI en esta versión
- **Export D365**: los CSV usan el nombre lógico del campo (ej: `emailaddress1`, no "Correo") y el lookup de Account se hace por `name` (Razón Social) porque el Data Import Wizard de D365 resuelve lookups por nombre
- **Sin borrado físico**: usar `cr_bex_estadocliente = "Inactivo"` para "eliminar" clientes — preserva historial
- **Idioma**: toda la UI en español, comentarios en código en inglés

---

## Preparación para deploy en Azure App Service

Estas tres configuraciones deben estar presentes desde el inicio del proyecto — no son pasos de "cuando toque deployar", forman parte del setup base.

### `next.config.ts`

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

export default nextConfig
```

`output: 'standalone'` hace que el build genere una carpeta `.next/standalone` auto-contenida con solo las dependencias de runtime. El deploy pasa de subir ~300MB a ~40MB, sin necesidad de `npm install` en el servidor.

### `package.json` — scripts

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

- `start` apunta a `node server.js` — ese `server.js` es el que genera el standalone build y respeta `process.env.PORT` que Azure inyecta automáticamente.
- `postinstall` garantiza que el cliente Prisma se regenere siempre que se instalen deps, tanto en local como en CI.

### Startup command en Azure App Service

El startup command del App Service debe ser exactamente:

```
node server.js
```

Se configura en: **App Service → Configuration → General settings → Startup Command**

O vía CLI al crear el recurso (ver `DEPLOY.md`).

---

## Criterios de éxito (Definition of Done)

- [ ] Login con cuenta de Azure AD de BEX funcional
- [ ] CRUD completo de clientes con las 9 secciones del Excel
- [ ] Vista 360° con todos los tabs navegables
- [ ] Gestiones CS registrables y consultables
- [ ] Oportunidades registrables y consultables
- [ ] Export de un cliente genera ZIP con 5 CSVs importables a D365 CS
- [ ] Dashboard con 4 KPIs funcionales
- [ ] DataGrid de clientes con filtro por estado e industria

---

*Generado por BEXTechnology — CRM transitorio hacia Dynamics 365 Customer Service*
*Stack: Next.js 14 · TypeScript · Fluent UI v9 · Prisma · PostgreSQL · NextAuth v5 + Azure AD*
