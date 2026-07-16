"use client"

import { useRef, useState } from "react"
import {
  makeStyles,
  tokens,
  Card,
  Text,
  Subtitle2,
  Body1,
  Button,
  Badge,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from "@fluentui/react-components"
import { ArrowDownloadRegular, ArrowUploadRegular } from "@fluentui/react-icons"
import { IMPORT_COLUMNS } from "@/lib/import/bulk"

type Resultado = {
  clientesActualizados: number
  camposAplicados: number
  contactos: number
  ejecutivos: number
  contratos: number
  entregables: number
  filasSinCambios: number
  noEncontrados: string[]
  ambiguos: string[]
}

const useStyles = makeStyles({
  wrap: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL },
  steps: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: tokens.spacingHorizontalL },
  step: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS, padding: tokens.spacingHorizontalL },
  stepHead: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  stepNum: { width: "24px", height: "24px", borderRadius: "50%", background: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: tokens.fontWeightBold, fontSize: tokens.fontSizeBase200, flexShrink: 0 },
  fileRow: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", flexWrap: "wrap" },
  fileName: { color: tokens.colorNeutralForeground3 },
  card: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  tableWrap: { maxHeight: "420px", overflowY: "auto" },
  chips: { display: "flex", gap: tokens.spacingHorizontalS, flexWrap: "wrap", marginTop: tokens.spacingVerticalS },
})

const destinoColor = (d: string): "brand" | "success" | "warning" | "informative" | "subtle" =>
  d.startsWith("Contacto") ? "success" : d.startsWith("Ejecutivo") ? "warning" : d.startsWith("Producto") ? "informative" : d.startsWith("Cliente") ? "brand" : "subtle"

export function BulkImportView() {
  const styles = useStyles()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Resultado | null>(null)

  async function doImport() {
    if (!file) return
    setImporting(true)
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/clientes/importar`, { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo importar")
        return
      }
      setResult(json as Resultado)
    } catch {
      setError("Error leyendo el archivo o de red")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.steps}>
        <Card className={styles.step}>
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>1</span>
            <Subtitle2>Descarga la plantilla</Subtitle2>
          </div>
          <Body1>
            Un <b>único Excel</b> con dos hojas: <b>Clientes</b> (una fila por cliente, con su valor actual) y{" "}
            <b>Entregables</b> (una fila por entregable de valor agregado). Las columnas acotadas traen{" "}
            <b>lista desplegable</b>.
          </Body1>
          <Button appearance="primary" icon={<ArrowDownloadRegular />} as="a" href={`/api/clientes/importar/plantilla`}>
            Descargar plantilla .xlsx
          </Button>
        </Card>

        <Card className={styles.step}>
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>2</span>
            <Subtitle2>Diligencia los datos</Subtitle2>
          </div>
          <Body1>
            No cambies <b>Nombre Empresa</b> (identifica al cliente con el nombre exacto del portal). Edita las
            demás columnas. Reglas:
          </Body1>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: tokens.fontSizeBase200 }}>
            <li>Fechas <b>YYYY-MM-DD</b>; Sí/No para preguntas; números sin texto (el valor puede llevar $ o miles).</li>
            <li>Una celda en blanco <b>no</b> borra el dato existente.</li>
            <li>Nombre no encontrado → la fila se <b>omite</b> y se reporta.</li>
          </ul>
        </Card>

        <Card className={styles.step}>
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>3</span>
            <Subtitle2>Sube el archivo</Subtitle2>
          </div>
          <div className={styles.fileRow}>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setResult(null)
                setError(null)
              }}
            />
            <Button appearance="secondary" onClick={() => fileRef.current?.click()}>Elegir archivo</Button>
            {file && <span className={styles.fileName}>{file.name}</span>}
          </div>
          <Button appearance="primary" icon={<ArrowUploadRegular />} onClick={doImport} disabled={!file || importing}>
            {importing ? "Importando…" : "Importar a todos los clientes"}
          </Button>
        </Card>
      </div>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Error al importar</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      )}

      {result && (
        <MessageBar intent={result.clientesActualizados > 0 ? "success" : "warning"}>
          <MessageBarBody>
            <MessageBarTitle>
              {result.clientesActualizados > 0
                ? `${result.clientesActualizados} cliente(s) actualizado(s) · ${result.camposAplicados} campo(s)`
                : "No se aplicaron cambios"}
            </MessageBarTitle>
            {(result.contactos > 0 || result.ejecutivos > 0 || result.contratos > 0 || result.entregables > 0) && (
              <>
                {result.contactos} contacto(s), {result.ejecutivos} ejecutivo(s), {result.contratos} contrato(s),{" "}
                {result.entregables} entregable(s).{" "}
              </>
            )}
            {result.filasSinCambios > 0 && <>{result.filasSinCambios} fila(s) sin valores nuevos. </>}
            {result.noEncontrados.length > 0 && (
              <div className={styles.chips}>
                <Text size={200}>No encontrados ({result.noEncontrados.length}):</Text>
                {result.noEncontrados.slice(0, 30).map((n, i) => (
                  <Badge key={i} appearance="tint" color="warning">{n}</Badge>
                ))}
              </div>
            )}
            {result.ambiguos.length > 0 && (
              <div className={styles.chips}>
                <Text size={200}>Nombre duplicado ({result.ambiguos.length}):</Text>
                {result.ambiguos.slice(0, 30).map((n, i) => (
                  <Badge key={i} appearance="tint" color="danger">{n}</Badge>
                ))}
              </div>
            )}
          </MessageBarBody>
        </MessageBar>
      )}

      <Card className={styles.card}>
        <Subtitle2>Columnas del archivo y a dónde va cada dato</Subtitle2>
        <div className={styles.tableWrap}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Columna</TableHeaderCell>
                <TableHeaderCell>Sección</TableHeaderCell>
                <TableHeaderCell>Destino</TableHeaderCell>
                <TableHeaderCell>Formato / opciones</TableHeaderCell>
                <TableHeaderCell>Ejemplo</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {IMPORT_COLUMNS.map((c) => (
                <TableRow key={c.header}>
                  <TableCell><Text weight="semibold">{c.header}</Text></TableCell>
                  <TableCell><Text size={200}>{c.seccion}</Text></TableCell>
                  <TableCell>
                    <Badge appearance="tint" color={destinoColor(c.destino)}>{c.destino}</Badge>
                  </TableCell>
                  <TableCell><Text size={200}>{c.opciones ? c.opciones.join(" · ") : c.tipo}</Text></TableCell>
                  <TableCell><Text size={200} italic>{c.ejemplo}</Text></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
