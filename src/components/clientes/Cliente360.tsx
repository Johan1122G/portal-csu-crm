"use client"

import { useState } from "react"
import {
  makeStyles,
  tokens,
  TabList,
  Tab,
  Card,
  Title2,
  Badge,
  Button,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
} from "@fluentui/react-components"
import { StarFilled, EditRegular } from "@fluentui/react-icons"
import { format } from "date-fns"
import Link from "next/link"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ExportButton } from "@/components/shared/ExportButton"
import { InfoGeneralTab } from "@/components/clientes/tabs/InfoGeneralTab"
import { ConocimientoTab } from "@/components/clientes/tabs/ConocimientoTab"
import { SoporteCSTab } from "@/components/clientes/tabs/SoporteCSTab"
import { ContactosTab } from "@/components/clientes/tabs/ContactosTab"
import { ProductosTab } from "@/components/clientes/tabs/ProductosTab"
import { RelacionamientoTab } from "@/components/clientes/tabs/RelacionamientoTab"
import { TicketsTab } from "@/components/clientes/tabs/TicketsTab"
import { ReunionesTab } from "@/components/clientes/tabs/ReunionesTab"
import { ImportarTab } from "@/components/clientes/tabs/ImportarTab"
import { InsightsTab } from "@/components/clientes/tabs/InsightsTab"
import type { AccountWithRelations } from "@/types"

const useStyles = makeStyles({
  header: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalL,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalL,
    flexWrap: "wrap",
  },
  actions: { display: "flex", gap: tokens.spacingHorizontalS, flexShrink: 0 },
  badges: { display: "flex", gap: tokens.spacingHorizontalS, alignItems: "center", flexWrap: "wrap" },
  meta: { display: "flex", gap: tokens.spacingHorizontalL, color: tokens.colorNeutralForeground3, flexWrap: "wrap" },
  tabs: { marginBottom: tokens.spacingVerticalL },
  cardPad: { padding: tokens.spacingHorizontalL },
})

const fmtDate = (d?: Date | string | null) => (d ? format(new Date(d), "dd/MM/yyyy") : "—")
const fmtDateTime = (d?: Date | string | null) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm") : "—")
const v = (s?: string | number | null) => (s == null || s === "" ? "—" : String(s))

type TabKey =
  | "general"
  | "contactos"
  | "relacionamiento"
  | "conocimiento"
  | "soporte"
  | "productos"
  | "gestiones"
  | "oportunidades"
  | "tickets"
  | "insights"
  | "reuniones"
  | "importar"

export function Cliente360({ cliente }: { cliente: AccountWithRelations }) {
  const styles = useStyles()
  const [tab, setTab] = useState<TabKey>("general")

  return (
    <>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Title2>{cliente.name}</Title2>
            <StatusBadge value={cliente.cr_bex_estadocliente} />
            {cliente.cr_bex_clienteestrategico && (
              <Badge appearance="filled" color="brand" icon={<StarFilled />}>
                Estratégico
              </Badge>
            )}
          </div>
          <div className={styles.actions}>
            <Link href={`/clientes/${cliente.id}/editar`}>
              <Button appearance="secondary" icon={<EditRegular />}>
                Editar
              </Button>
            </Link>
            <ExportButton
              url={`/api/clientes/${cliente.id}/export`}
              filename={`cliente-${cliente.accountnumber}-d365.zip`}
            />
          </div>
        </div>
        <div className={styles.meta}>
          <span>NIT: {cliente.accountnumber}</span>
          <span>Industria: {v(cliente.industrycode)}</span>
          <span>Ciudad: {v(cliente.address1_city)}</span>
        </div>
      </div>

      <TabList
        className={styles.tabs}
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(d.value as TabKey)}
      >
        <Tab value="general">Información General</Tab>
        <Tab value="contactos">Contactos ({cliente.contacts.length})</Tab>
        <Tab value="relacionamiento">Relacionamiento ({cliente.relationships.length})</Tab>
        <Tab value="conocimiento">Conocimiento</Tab>
        <Tab value="soporte">Soporte / CS</Tab>
        <Tab value="productos">Productos ({cliente.products.length})</Tab>
        <Tab value="gestiones">Gestiones CS ({cliente.activities.length})</Tab>
        <Tab value="oportunidades">Oportunidades ({cliente.opportunities.length})</Tab>
        <Tab value="tickets">Tickets (GLPI)</Tab>
        <Tab value="insights">Insights (IA)</Tab>
        <Tab value="reuniones">Reuniones (Teams)</Tab>
        <Tab value="importar">Importar datos</Tab>
      </TabList>

      {/* General */}
      {tab === "general" && <InfoGeneralTab cliente={cliente} />}

      {/* Contactos */}
      {tab === "contactos" && (
        <Card className={styles.cardPad}>
          <ContactosTab accountId={cliente.id} items={cliente.contacts} />
        </Card>
      )}

      {/* Relacionamiento */}
      {tab === "relacionamiento" && (
        <RelacionamientoTab accountId={cliente.id} items={cliente.relationships} />
      )}

      {/* Conocimiento */}
      {tab === "conocimiento" && <ConocimientoTab cliente={cliente} />}

      {/* Soporte / CS */}
      {tab === "soporte" && <SoporteCSTab cliente={cliente} />}

      {/* Productos */}
      {tab === "productos" && (
        <Card className={styles.cardPad}>
          <ProductosTab accountId={cliente.id} accountName={cliente.name} items={cliente.products} />
        </Card>
      )}

      {/* Gestiones CS */}
      {tab === "gestiones" && (
        <Card className={styles.cardPad}>
          {cliente.activities.length === 0 ? (
            <EmptyState title="Sin gestiones CS" />
          ) : (
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Tema</TableHeaderCell>
                  <TableHeaderCell>Canal</TableHeaderCell>
                  <TableHeaderCell>Responsable</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cliente.activities.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{fmtDateTime(a.scheduledstart)}</TableCell>
                    <TableCell>{a.cr_bex_tipogestion}</TableCell>
                    <TableCell>{v(a.subject)}</TableCell>
                    <TableCell>{v(a.cr_bex_canal)}</TableCell>
                    <TableCell>{v(a.cr_bex_responsablecs)}</TableCell>
                    <TableCell>
                      <StatusBadge value={a.statecode} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Oportunidades */}
      {tab === "oportunidades" && (
        <Card className={styles.cardPad}>
          {cliente.opportunities.length === 0 ? (
            <EmptyState title="Sin oportunidades" />
          ) : (
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Descripción</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Impacto</TableHeaderCell>
                  <TableHeaderCell>Prioridad</TableHeaderCell>
                  <TableHeaderCell>Compromiso</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cliente.opportunities.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.name}</TableCell>
                    <TableCell>{v(o.cr_bex_tipo)}</TableCell>
                    <TableCell>
                      <StatusBadge value={o.cr_bex_impacto} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={o.prioritycode} />
                    </TableCell>
                    <TableCell>{fmtDate(o.estimatedclosedate)}</TableCell>
                    <TableCell>
                      <StatusBadge value={o.statecode} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Tickets (GLPI) */}
      {tab === "tickets" && <TicketsTab accountId={cliente.id} />}

      {/* Insights (IA) */}
      {tab === "insights" && <InsightsTab accountId={cliente.id} />}

      {/* Reuniones (Teams) */}
      {tab === "reuniones" && <ReunionesTab accountId={cliente.id} />}

      {/* Importar datos */}
      {tab === "importar" && (
        <ImportarTab accountId={cliente.id} accountNumber={cliente.accountnumber} />
      )}
    </>
  )
}
