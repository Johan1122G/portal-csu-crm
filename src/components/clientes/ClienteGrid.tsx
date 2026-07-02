"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  makeStyles,
  tokens,
  Button,
  Input,
  Switch,
  Spinner,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  Text,
} from "@fluentui/react-components"
import {
  AddRegular,
  SearchRegular,
  StarFilled,
  OpenRegular,
  DeleteRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  ArrowSyncRegular,
  ArrowUploadRegular,
} from "@fluentui/react-icons"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ExportButton } from "@/components/shared/ExportButton"
import { CatalogDropdown } from "@/components/catalog/CatalogControls"
import type { AccountListItem } from "@/types"

const useStyles = makeStyles({
  toolbar: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: tokens.spacingVerticalL,
  },
  search: { minWidth: "240px" },
  spacer: { flexGrow: 1 },
  switch: { marginLeft: tokens.spacingHorizontalS },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: "hidden",
  },
  row: { cursor: "pointer" },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  rowActions: { display: "flex", gap: tokens.spacingHorizontalXS },
  strategic: { color: tokens.colorBrandForeground1, display: "inline-flex", alignItems: "center" },
  pager: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: tokens.spacingVerticalM,
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground3,
  },
  pagerBtns: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalM },
})

export function ClienteGrid() {
  const styles = useStyles()
  const router = useRouter()

  const LIMIT = 50
  const [rows, setRows] = useState<AccountListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [estado, setEstado] = useState<string>("")
  const [industria, setIndustria] = useState<string>("")
  const [soloEstrategicos, setSoloEstrategicos] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (search) qs.set("search", search)
      if (estado) qs.set("estado", estado)
      if (industria) qs.set("industria", industria)
      if (soloEstrategicos) qs.set("estrategico", "true")
      qs.set("page", String(page))
      qs.set("limit", String(LIMIT))
      const res = await fetch(`/api/clientes?${qs.toString()}`)
      const json = await res.json()
      setRows(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [search, estado, industria, soloEstrategicos, page])

  // Debounce: re-consulta 300ms después del último cambio de filtro/página.
  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  // Al cambiar cualquier filtro, vuelve a la página 1.
  useEffect(() => {
    setPage(1)
  }, [search, estado, industria, soloEstrategicos])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    if (!confirm(`¿Marcar "${name}" como Inactivo? (no se borra, preserva historial)`)) return
    await fetch(`/api/clientes/${id}`, { method: "DELETE" })
    fetchData()
  }

  return (
    <>
      <div className={styles.toolbar}>
        <Input
          className={styles.search}
          placeholder="Buscar por razón social o NIT…"
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          contentBefore={<SearchRegular />}
        />
        <CatalogDropdown catalogKey="ESTADOS_CLIENTE" placeholder="Estado" value={estado} onSelect={setEstado} clearable />
        <CatalogDropdown catalogKey="INDUSTRIAS" placeholder="Industria" value={industria} onSelect={setIndustria} clearable />
        <Switch
          className={styles.switch}
          label="Solo estratégicos"
          checked={soloEstrategicos}
          onChange={(_, d) => setSoloEstrategicos(d.checked)}
        />
        <div className={styles.spacer} />
        <Button
          appearance="secondary"
          icon={<ArrowSyncRegular />}
          onClick={() => router.push("/clientes/sincronizar")}
        >
          Sincronizar desde GLPI
        </Button>
        <Button
          appearance="secondary"
          icon={<ArrowUploadRegular />}
          onClick={() => router.push("/clientes/importar")}
        >
          Importar datos
        </Button>
        <ExportButton
          url="/api/clientes/export"
          filename="bex-crm-d365-export.zip"
          label="Exportar todo a D365"
        />
        <Button
          appearance="primary"
          icon={<AddRegular />}
          onClick={() => router.push("/clientes/nuevo")}
        >
          Nuevo cliente
        </Button>
      </div>

      {loading ? (
        <div className={styles.center}>
          <Spinner label="Cargando clientes…" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Sin clientes"
          description="No hay clientes que coincidan con los filtros. Crea el primero."
          action={
            <Button appearance="primary" icon={<AddRegular />} onClick={() => router.push("/clientes/nuevo")}>
              Nuevo cliente
            </Button>
          }
        />
      ) : (
        <div className={styles.card}>
          <Table aria-label="Clientes" size="medium">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Razón Social</TableHeaderCell>
                <TableHeaderCell>NIT</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Industria</TableHeaderCell>
                <TableHeaderCell>Ciudad</TableHeaderCell>
                <TableHeaderCell>Estratégico</TableHeaderCell>
                <TableHeaderCell>Satisfacción</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow
                  key={c.id}
                  className={styles.row}
                  onClick={() => router.push(`/clientes/${c.id}`)}
                >
                  <TableCell>
                    <Text weight="semibold">{c.name}</Text>
                  </TableCell>
                  <TableCell>{c.accountnumber}</TableCell>
                  <TableCell>
                    <StatusBadge value={c.cr_bex_estadocliente} />
                  </TableCell>
                  <TableCell>{c.industrycode ?? "—"}</TableCell>
                  <TableCell>{c.address1_city ?? "—"}</TableCell>
                  <TableCell>
                    {c.cr_bex_clienteestrategico ? (
                      <span className={styles.strategic}>
                        <StarFilled />
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {c.cr_bex_nivelsatisfaccion != null ? `${c.cr_bex_nivelsatisfaccion}/10` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className={styles.rowActions}>
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<OpenRegular />}
                        aria-label="Ver"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/clientes/${c.id}`)
                        }}
                      />
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<DeleteRegular />}
                        aria-label="Inactivar"
                        onClick={(e) => handleDelete(e, c.id, c.name)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className={styles.pager}>
          <Text size={200}>
            Mostrando {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
          </Text>
          <div className={styles.pagerBtns}>
            <Button
              appearance="subtle"
              size="small"
              icon={<ChevronLeftRegular />}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Text size={200}>
              Página {page} de {totalPages}
            </Text>
            <Button
              appearance="subtle"
              size="small"
              icon={<ChevronRightRegular />}
              iconPosition="after"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
