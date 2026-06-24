"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
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

const useStyles = makeStyles({
  wrap: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL },
  card: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  steps: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: tokens.spacingHorizontalL },
  step: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS, padding: tokens.spacingHorizontalL },
  stepNum: { width: "24px", height: "24px", borderRadius: "50%", background: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: tokens.fontWeightBold, fontSize: tokens.fontSizeBase200 },
  stepHead: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  fileRow: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", flexWrap: "wrap" },
  fileName: { color: tokens.colorNeutralForeground3 },
  tableWrap: { maxHeight: "360px", overflowY: "auto" },
})

const equipoColor: Record<Equipo, "brand" | "success" | "informative"> = {
  Comercial: "brand",
  Técnico: "success",
  Ambos: "informative",
}

export function ImportarTab({ accountId, accountNumber }: { accountId: string; accountNumber: string }) {
  const styles = useStyles()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ aplicados: string[]; ignorados: { campo: string; motivo: string }[] } | null>(null)

  async function doImport() {
    if (!file) return
    setImporting(true)
    setError(null)
    setResult(null)
    try {
      const csv = await file.text()
      const res = await fetch(`/api/clientes/${accountId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo importar")
        return
      }
      setResult({ aplicados: json.aplicados ?? [], ignorados: json.ignorados ?? [] })
      router.refresh()
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
            El CSV trae cada campo con su <b>valor actual</b>, el <b>equipo</b> que lo llena, el{" "}
            <b>formato/opciones</b> permitidos y un <b>ejemplo</b>. Compártelo con los equipos técnico y comercial.
          </Body1>
          <Button
            appearance="primary"
            icon={<ArrowDownloadRegular />}
            as="a"
            href={`/api/clientes/${accountId}/plantilla`}
          >
            Descargar plantilla CSV
          </Button>
        </Card>

        <Card className={styles.step}>
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>2</span>
            <Subtitle2>Diligencia la columna “valor”</Subtitle2>
          </div>
          <Body1>
            Escribe <b>solo en la columna «valor»</b>. No borres ni cambies las columnas{" "}
            <i>seccion, campo, etiqueta, equipo</i>. Reglas:
          </Body1>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: tokens.fontSizeBase200 }}>
            <li>Fechas en formato <b>YYYY-MM-DD</b> (ej. 2026-01-15).</li>
            <li>Sí/No para las preguntas; números sin texto (ej. 1000).</li>
            <li>Respeta las opciones de la columna <i>formato/opciones</i>.</li>
            <li>Un campo en blanco <b>no</b> borra lo existente (no pisa el dato actual).</li>
          </ul>
        </Card>

        <Card className={styles.step}>
          <div className={styles.stepHead}>
            <span className={styles.stepNum}>3</span>
            <Subtitle2>Sube el CSV diligenciado</Subtitle2>
          </div>
          <div className={styles.fileRow}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
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
          <Button
            appearance="primary"
            icon={<ArrowUploadRegular />}
            onClick={doImport}
            disabled={!file || importing}
          >
            {importing ? "Importando…" : "Importar datos"}
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
        <MessageBar intent={result.aplicados.length > 0 ? "success" : "warning"}>
          <MessageBarBody>
            <MessageBarTitle>
              {result.aplicados.length > 0
                ? `${result.aplicados.length} campo(s) actualizado(s)`
                : "No se aplicaron cambios"}
            </MessageBarTitle>
            {result.aplicados.length > 0 && <>Campos: {result.aplicados.join(", ")}. </>}
            {result.ignorados.length > 0 && <>Ignorados: {result.ignorados.map((i) => i.campo).join(", ")}.</>}
          </MessageBarBody>
        </MessageBar>
      )}

      <Card className={styles.card}>
        <Subtitle2>Quién llena qué (NIT {accountNumber})</Subtitle2>
        <div className={styles.tableWrap}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Sección</TableHeaderCell>
                <TableHeaderCell>Campo</TableHeaderCell>
                <TableHeaderCell>Equipo</TableHeaderCell>
                <TableHeaderCell>Formato / opciones</TableHeaderCell>
                <TableHeaderCell>Ejemplo</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLIENT_IMPORT_FIELDS.map((f) => (
                <TableRow key={f.campo}>
                  <TableCell>{f.seccion}</TableCell>
                  <TableCell>
                    <Text>{f.etiqueta}</Text>
                    <br />
                    <Text size={200} font="monospace">
                      {f.campo}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge appearance="tint" color={equipoColor[f.equipo]}>
                      {f.equipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Text size={200}>{FIELD_OPCIONES[f.campo] ?? "Texto libre"}</Text>
                  </TableCell>
                  <TableCell>
                    <Text size={200} italic>
                      {f.ejemplo}
                    </Text>
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
