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
import { CLIENT_IMPORT_FIELDS, FIELD_OPCIONES, type Equipo } from "@/lib/import/clientFields"

type Resultado = {
  clientesActualizados: number
  camposAplicados: number
  filasSinCambios: number
  noEncontrados: string[]
  ambiguos: string[]
  detalle: { cliente: string; campos: number }[]
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
  tableWrap: { maxHeight: "360px", overflowY: "auto" },
  chips: { display: "flex", gap: tokens.spacingHorizontalS, flexWrap: "wrap", marginTop: tokens.spacingVerticalS },
})

const equipoColor: Record<Equipo, "brand" | "success" | "informative"> = {
  Comercial: "brand",
  Técnico: "success",
  Ambos: "informative",
}

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
            Un <b>único Excel</b> con <b>una fila por cliente</b> (todos los clientes ya listados) y una columna
            por cada campo, con su <b>valor actual</b>. Cada encabezado tiene una nota con el formato y un ejemplo.
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
            No cambies la columna <b>Razón Social</b>: es la que identifica al cliente (debe quedar con el
            <b> nombre exacto</b> que ya tiene en el portal). Edita las columnas de datos. Reglas:
          </Body1>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: tokens.fontSizeBase200 }}>
            <li>Fechas en formato <b>YYYY-MM-DD</b>; Sí/No para preguntas; números sin texto.</li>
            <li>Una celda en blanco <b>no</b> borra el dato existente.</li>
            <li>Si un nombre no coincide con ningún cliente, esa fila se <b>omite</b> y se reporta.</li>
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
            <Button appearance="secondary" onClick={() => fileRef.current?.click()}>
              Elegir archivo
            </Button>
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
        <Subtitle2>Qué llena cada equipo</Subtitle2>
        <div className={styles.tableWrap}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Sección</TableHeaderCell>
                <TableHeaderCell>Columna</TableHeaderCell>
                <TableHeaderCell>Equipo</TableHeaderCell>
                <TableHeaderCell>Formato / opciones</TableHeaderCell>
                <TableHeaderCell>Ejemplo</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLIENT_IMPORT_FIELDS.map((f) => (
                <TableRow key={f.campo}>
                  <TableCell>{f.seccion}</TableCell>
                  <TableCell>{f.etiqueta}</TableCell>
                  <TableCell>
                    <Badge appearance="tint" color={equipoColor[f.equipo]}>{f.equipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Text size={200}>{FIELD_OPCIONES[f.campo] ?? "Texto libre"}</Text>
                  </TableCell>
                  <TableCell>
                    <Text size={200} italic>{f.ejemplo}</Text>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
