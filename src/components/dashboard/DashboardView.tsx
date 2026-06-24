"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  makeStyles,
  tokens,
  Card,
  Text,
  Subtitle2,
  Badge,
  ProgressBar,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
} from "@fluentui/react-components"
import {
  PeopleRegular,
  StarRegular,
  LightbulbRegular,
  CalendarLtrRegular,
  EmojiRegular,
} from "@fluentui/react-icons"
import { format } from "date-fns"
import { EmptyState } from "@/components/shared/EmptyState"

const useStyles = makeStyles({
  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalXL,
  },
  kpi: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXS, padding: tokens.spacingHorizontalL },
  kpiTop: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, color: tokens.colorNeutralForeground3 },
  kpiValue: { fontSize: "32px", fontWeight: tokens.fontWeightBold, lineHeight: "36px", color: tokens.colorBrandForeground1 },
  kpiSub: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  tables: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  tableCard: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold },
  tableWrap: { maxHeight: "360px", overflowY: "auto" },
  pctCell: { display: "flex", flexDirection: "column", gap: "2px", minWidth: "110px" },
  pctTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: tokens.spacingHorizontalS },
  cardTitle: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: tokens.spacingHorizontalS },
})

export type DashboardData = {
  activos: number
  estrategicos: number
  oppPendientes: number
  reunionesSemana: number
  horasPorCliente: { id: string; name: string; contratadas: number; consumidas: number }[]
  satisfaccionClientes: { id: string; name: string; score: number; adopcion: string | null }[]
  ultimasActividades: {
    id: string
    scheduledstart: string | Date
    cr_bex_tipogestion: string
    subject: string | null
    account: { id: string; name: string }
  }[]
  proximasReuniones: {
    id: string
    cr_bex_nombrepersona: string
    cr_bex_proximareunion: string | Date | null
    account: { id: string; name: string }
  }[]
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
}) {
  const styles = useStyles()
  return (
    <Card className={styles.kpi}>
      <div className={styles.kpiTop}>
        {icon}
        <Text size={200}>{label}</Text>
      </div>
      <span className={styles.kpiValue}>{value}</span>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </Card>
  )
}

// Nivel de consumo de la bolsa de horas: alto ≥90%, medio ≥70%, bajo resto.
// (Badge y ProgressBar usan nombres de color distintos para el rojo.)
type Nivel = "alto" | "medio" | "bajo"
function consumoNivel(pct: number): Nivel {
  if (pct >= 90) return "alto"
  if (pct >= 70) return "medio"
  return "bajo"
}
const badgeColor: Record<Nivel, "danger" | "warning" | "success"> = {
  alto: "danger",
  medio: "warning",
  bajo: "success",
}
const barColor: Record<Nivel, "error" | "warning" | "success"> = {
  alto: "error",
  medio: "warning",
  bajo: "success",
}

// Clasificación NPS a partir del nivel de satisfacción 0-10.
function npsClass(score: number): { label: string; color: "success" | "warning" | "danger" } {
  if (score >= 9) return { label: "Promotor", color: "success" }
  if (score >= 7) return { label: "Pasivo", color: "warning" }
  return { label: "Detractor", color: "danger" }
}

export function DashboardView({ data }: { data: DashboardData }) {
  const styles = useStyles()

  // NPS = %promotores − %detractores (sobre clientes con satisfacción registrada).
  const { nps, npsN } = useMemo(() => {
    const scored = data.satisfaccionClientes
    const n = scored.length
    if (n === 0) return { nps: null as number | null, npsN: 0 }
    const prom = scored.filter((c) => c.score >= 9).length
    const detr = scored.filter((c) => c.score <= 6).length
    return { nps: Math.round(((prom - detr) / n) * 100), npsN: n }
  }, [data.satisfaccionClientes])

  // Horas: ordenar por % de consumo desc (los más cerca del límite arriba).
  const horas = useMemo(() => {
    return data.horasPorCliente
      .map((c) => ({
        ...c,
        pct: c.contratadas > 0 ? Math.round((c.consumidas / c.contratadas) * 100) : null,
      }))
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))
  }, [data.horasPorCliente])

  // Satisfacción: ordenar ascendente (los que necesitan atención primero).
  const satisfaccion = useMemo(
    () => [...data.satisfaccionClientes].sort((a, b) => a.score - b.score),
    [data.satisfaccionClientes],
  )

  return (
    <>
      <div className={styles.kpis}>
        <Kpi icon={<PeopleRegular />} label="Clientes activos" value={data.activos} />
        <Kpi icon={<StarRegular />} label="Clientes estratégicos" value={data.estrategicos} />
        <Kpi icon={<LightbulbRegular />} label="Oportunidades pendientes" value={data.oppPendientes} />
        <Kpi icon={<CalendarLtrRegular />} label="Reuniones esta semana" value={data.reunionesSemana} />
        <Kpi
          icon={<EmojiRegular />}
          label="NPS (satisfacción)"
          value={nps === null ? "—" : nps}
          sub={npsN > 0 ? `${npsN} cliente${npsN === 1 ? "" : "s"} con nivel registrado` : "Sin datos de satisfacción"}
        />
      </div>

      <div className={styles.tables}>
        {/* Consumo de horas por cliente */}
        <Card className={styles.tableCard}>
          <Subtitle2>Consumo de horas por cliente</Subtitle2>
          {horas.length === 0 ? (
            <EmptyState title="Sin bolsas de horas" description="Ningún cliente tiene horas contratadas." />
          ) : (
            <div className={styles.tableWrap}>
              <Table size="small">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Cliente</TableHeaderCell>
                    <TableHeaderCell>Cons. / Contr.</TableHeaderCell>
                    <TableHeaderCell>Consumo</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {horas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link className={styles.link} href={`/clientes/${c.id}`}>
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {c.consumidas} / {c.contratadas || "—"}
                      </TableCell>
                      <TableCell>
                        {c.pct === null ? (
                          <Text size={200}>—</Text>
                        ) : (
                          (() => {
                            const nivel = consumoNivel(c.pct)
                            return (
                              <div className={styles.pctCell}>
                                <div className={styles.pctTop}>
                                  <Badge appearance="tint" color={badgeColor[nivel]}>
                                    {c.pct}%
                                  </Badge>
                                </div>
                                <ProgressBar
                                  value={Math.min(c.pct, 100) / 100}
                                  color={barColor[nivel]}
                                  thickness="medium"
                                />
                              </div>
                            )
                          })()
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Satisfacción por cliente */}
        <Card className={styles.tableCard}>
          <div className={styles.cardTitle}>
            <Subtitle2>Satisfacción por cliente</Subtitle2>
            {nps !== null && <Text className={styles.kpiSub}>NPS {nps}</Text>}
          </div>
          {satisfaccion.length === 0 ? (
            <EmptyState title="Sin datos" description="Ningún cliente tiene nivel de satisfacción registrado." />
          ) : (
            <div className={styles.tableWrap}>
              <Table size="small">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Cliente</TableHeaderCell>
                    <TableHeaderCell>Nivel</TableHeaderCell>
                    <TableHeaderCell>Clasificación</TableHeaderCell>
                    <TableHeaderCell>Adopción</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {satisfaccion.map((c) => {
                    const cls = npsClass(c.score)
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link className={styles.link} href={`/clientes/${c.id}`}>
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell>{c.score}/10</TableCell>
                        <TableCell>
                          <Badge appearance="tint" color={cls.color}>
                            {cls.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{c.adopcion ?? "—"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <div className={styles.tables}>
        <Card className={styles.tableCard}>
          <Subtitle2>Últimas gestiones CS</Subtitle2>
          {data.ultimasActividades.length === 0 ? (
            <EmptyState title="Sin gestiones registradas" />
          ) : (
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Tema</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ultimasActividades.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{format(new Date(a.scheduledstart), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Link className={styles.link} href={`/clientes/${a.account.id}`}>
                        {a.account.name}
                      </Link>
                    </TableCell>
                    <TableCell>{a.cr_bex_tipogestion}</TableCell>
                    <TableCell>{a.subject ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className={styles.tableCard}>
          <Subtitle2>Próximas reuniones</Subtitle2>
          {data.proximasReuniones.length === 0 ? (
            <EmptyState title="Sin reuniones próximas" />
          ) : (
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Persona BEXT</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.proximasReuniones.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.cr_bex_proximareunion ? format(new Date(r.cr_bex_proximareunion), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <Link className={styles.link} href={`/clientes/${r.account.id}`}>
                        {r.account.name}
                      </Link>
                    </TableCell>
                    <TableCell>{r.cr_bex_nombrepersona}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
