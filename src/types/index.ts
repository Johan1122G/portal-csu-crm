import type {
  Account,
  Contact,
  BextRelationship,
  ProductService,
  CSActivity,
  OpportunityRecommendation,
} from "@prisma/client"

// Re-export de los modelos Prisma para usar en toda la app.
export type {
  Account,
  Contact,
  BextRelationship,
  ProductService,
  CSActivity,
  OpportunityRecommendation,
}

// Account con todas sus relaciones — la forma que devuelve GET /api/clientes/[id]
// y la que consume el export a D365.
export type AccountWithRelations = Account & {
  contacts: Contact[]
  relationships: BextRelationship[]
  products: ProductService[]
  activities: CSActivity[]
  opportunities: OpportunityRecommendation[]
}

// Fila ligera para el DataGrid de clientes (sin relaciones pesadas).
export type AccountListItem = Pick<
  Account,
  | "id"
  | "name"
  | "accountnumber"
  | "cr_bex_estadocliente"
  | "industrycode"
  | "address1_city"
  | "cr_bex_clienteestrategico"
  | "cr_bex_nivelsatisfaccion"
>

// Respuesta paginada estándar de las APIs de lista.
export type Paginated<T> = {
  data: T[]
  total: number
  page: number
  limit: number
}
