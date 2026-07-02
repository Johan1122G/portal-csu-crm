"use client"

import { useState } from "react"
import Link from "next/link"
import { Button, Spinner } from "@fluentui/react-components"
import { PrintRegular, SparkleRegular, ArrowLeftRegular } from "@fluentui/react-icons"
import type { Qbr } from "@/lib/analytics/qbr"

// Estilos en CSS plano (no Fluent tokens) para control total de la impresión.
const STYLE = `
.qbr-wrap { max-width: 900px; margin: 0 auto; padding: 24px 28px 64px; color: #1a1a1a; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.5; }
.qbr-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
.qbr-spacer { flex-grow: 1; }
.qbr-header { border-bottom: 3px solid #8b2727; padding-bottom: 14px; margin-bottom: 22px; }
.qbr-brand { font-size: 12px; font-weight: 700; letter-spacing: .5px; color: #8b2727; text-transform: uppercase; }
.qbr-title { font-size: 26px; font-weight: 700; margin: 4px 0 2px; }
.qbr-sub { color: #6b6b6b; font-size: 14px; }
.qbr-h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: #8b2727; margin: 26px 0 10px; border-bottom: 1px solid #e6e3e3; padding-bottom: 4px; }
.qbr-hero { display: flex; gap: 22px; align-items: center; margin: 18px 0; flex-wrap: wrap; }
.qbr-score { width: 92px; height: 92px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.qbr-score .n { font-size: 30px; font-weight: 700; line-height: 32px; }
.qbr-score .l { font-size: 10px; text-transform: uppercase; opacity: .9; }
.qbr-drivers { flex-grow: 1; min-width: 240px; }
.qbr-driver { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; font-size: 13px; }
.qbr-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.qbr-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 14px 0; }
.qbr-kpi { border: 1px solid #e6e3e3; border-radius: 8px; padding: 10px 12px; }
.qbr-kpi .t { font-size: 11px; color: #6b6b6b; }
.qbr-kpi .v { font-size: 22px; font-weight: 700; color: #8b2727; }
.qbr-card { background: #faf9f9; border: 1px solid #eee; border-radius: 8px; padding: 14px 16px; margin: 10px 0; }
.qbr-ul { margin: 6px 0 0; padding-left: 20px; }
.qbr-ul li { margin-bottom: 5px; }
table.qbr-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
table.qbr-tbl th { text-align: left; color: #6b6b6b; font-weight: 600; border-bottom: 1px solid #e6e3e3; padding: 6px 8px; }
table.qbr-tbl td { padding: 6px 8px; border-bottom: 1px solid #f0eeee; }
.qbr-tag { display: inline-block; font-size: 11px; padding: 1px 8px; border-radius: 12px; background: #fcf2f2; color: #8b2727; border: 1px solid #f0d4d4; }
.qbr-foot { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e6e3e3; color: #9b9b9b; font-size: 11px; text-align: center; }
.qbr-muted { color: #6b6b6b; font-size: 13px; }
@media print {
  .qbr-no-print { display: none !important; }
  .qbr-wrap { max-width: none; padding: 0; }
  .qbr-card { background: #faf9f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .qbr-score, .qbr-kpi .v, .qbr-tag { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .qbr-h2 { break-after: avoid; }
  table.qbr-tbl { break-inside: avoid; }
}
`

const bg = (c: string) => (c === "verde" ? "#1f9d55" : c === "amarillo" ? "#c98a00" : c === "gris" ? "#8a8886" : "#c0392b")
const dot = (e: string) => (e === "bueno" ? "#1f9d55" : e === "neutral" ? "#c98a00" : "#c0392b")
const num = (n: number | null) => (n == null ? "—" : String(n))

export function QbrReport({ initial, accountId }: { initial: Qbr; accountId: string }) {
  const [qbr, setQbr] = useState<Qbr>(initial)
  const [genIA, setGenIA] = useState(false)

  async function generarNarrativa() {
    setGenIA(true)
    try {
      const res = await fetch(`/api/clientes/${accountId}/qbr?narrativa=1`)
      const json = await res.json()
      if (res.ok) setQbr(json as Qbr)
    } finally {
      setGenIA(false)
    }
  }

  const a = qbr.analytics.resumen
  const s = qbr.salud
  const maxMes = Math.max(1, ...qbr.analytics.tendenciaMensual.map((m) => m.casos))

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="qbr-wrap">
        <div className="qbr-toolbar qbr-no-print">
          <Link href={`/clientes/${accountId}`}>
            <Button appearance="subtle" icon={<ArrowLeftRegular />}>Volver</Button>
          </Link>
          <div className="qbr-spacer" />
          <Button appearance="secondary" icon={genIA ? <Spinner size="tiny" /> : <SparkleRegular />} onClick={generarNarrativa} disabled={genIA || a.totalTickets === 0}>
            {qbr.narrativa ? "Regenerar resumen IA" : "Resumen ejecutivo (IA)"}
          </Button>
          <Button appearance="primary" icon={<PrintRegular />} onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </Button>
        </div>

        {/* Encabezado */}
        <div className="qbr-header">
          <div className="qbr-brand">BEXTechnology · Quarterly Business Review</div>
          <div className="qbr-title">{qbr.cliente.name}</div>
          <div className="qbr-sub">
            {qbr.cliente.industria ? `${qbr.cliente.industria} · ` : ""}
            {qbr.periodo.desde && qbr.periodo.hasta
              ? `Período: ${qbr.periodo.desde} → ${qbr.periodo.hasta}`
              : "Período: sin datos de tickets"}
            {qbr.cliente.estrategico ? " · ⭐ Cliente estratégico" : ""}
          </div>
        </div>

        {a.totalTickets === 0 && (
          <div className="qbr-card">
            <b>Sin datos de soporte sincronizados.</b>{" "}
            <span className="qbr-muted">
              Este QBR muestra el contexto disponible. Sincroniza los tickets de GLPI del cliente para incluir
              salud, métricas y tendencias.
            </span>
          </div>
        )}

        {/* Salud + drivers */}
        {s && (
          <>
            <div className="qbr-h2">Salud de la cuenta</div>
            <div className="qbr-hero">
              <div className="qbr-score" style={{ background: bg(s.color) }}>
                <span className="n">{s.score ?? "—"}</span>
                <span className="l">{s.color === "gris" ? "Sin datos" : "Salud"}</span>
              </div>
              <div className="qbr-drivers">
                {s.drivers.map((d) => (
                  <div key={d.nombre} className="qbr-driver">
                    <span className="qbr-dot" style={{ background: dot(d.estado) }} />
                    <b style={{ minWidth: 150, display: "inline-block" }}>{d.nombre}</b>
                    <span className="qbr-muted">{d.detalle}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Resumen ejecutivo (IA) */}
        {qbr.narrativa && (
          <>
            <div className="qbr-h2">Resumen ejecutivo</div>
            {qbr.narrativa.resumenEjecutivo && <p>{qbr.narrativa.resumenEjecutivo}</p>}
            {qbr.narrativa.logros.length > 0 && (
              <div className="qbr-card">
                <b>Logros del período</b>
                <ul className="qbr-ul">
                  {qbr.narrativa.logros.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            )}
          </>
        )}

        {/* KPIs */}
        {a.totalTickets > 0 && (
          <>
            <div className="qbr-h2">Indicadores de soporte</div>
            <div className="qbr-kpis">
              <div className="qbr-kpi"><div className="t">Tickets</div><div className="v">{a.totalTickets}</div></div>
              <div className="qbr-kpi"><div className="t">Cerrados</div><div className="v">{a.cerrados}</div></div>
              <div className="qbr-kpi"><div className="t">Horas totales</div><div className="v">{a.horasTotales}</div></div>
              <div className="qbr-kpi"><div className="t">Resol. prom. (h)</div><div className="v">{num(a.resolucionPromedioHoras)}</div></div>
              <div className="qbr-kpi"><div className="t">CSAT ({a.csatRespuestas})</div><div className="v">{num(a.csatPromedio)}</div></div>
              <div className="qbr-kpi"><div className="t">SLA incumplido</div><div className="v">{a.slaIncumplidoPct}%</div></div>
            </div>

            {/* Bolsa de horas */}
            {s?.bolsa.contratadas != null && (
              <div className="qbr-card">
                <b>Bolsa de horas: </b>
                {s.bolsa.consumidas ?? "—"} / {s.bolsa.contratadas} h
                {s.bolsa.pct != null ? ` (${s.bolsa.pct}% consumida)` : ""}
                {s.bolsa.semanasParaAgotar != null && (
                  <span className="qbr-muted">
                    {" "}· {s.bolsa.semanasParaAgotar === 0 ? "bolsa agotada" : `~${s.bolsa.semanasParaAgotar} semanas para agotar`}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {/* Por categoría */}
        {qbr.analytics.porCategoria.length > 0 && (
          <>
            <div className="qbr-h2">Soporte por categoría</div>
            <table className="qbr-tbl">
              <thead>
                <tr><th>Categoría</th><th>Casos</th><th>%</th><th>Horas</th><th>CSAT</th></tr>
              </thead>
              <tbody>
                {qbr.analytics.porCategoria.slice(0, 8).map((c) => (
                  <tr key={c.categoria}>
                    <td>{c.categoria}</td><td>{c.casos}</td><td>{c.pct}%</td><td>{c.horas}</td><td>{num(c.csatPromedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Tendencia */}
        {qbr.analytics.tendenciaMensual.length > 0 && (
          <>
            <div className="qbr-h2">Tendencia mensual de tickets</div>
            <div>
              {qbr.analytics.tendenciaMensual.map((m) => (
                <div key={m.mes} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ width: 62, fontSize: 12, color: "#6b6b6b" }}>{m.mes}</span>
                  <div style={{ height: 13, background: "#e3b7b7", borderRadius: 3, minWidth: 2, width: `${(m.casos / maxMes) * 100}%` }} />
                  <span style={{ fontSize: 12, color: "#6b6b6b" }}>{m.casos}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Oportunidades */}
        <div className="qbr-h2">Oportunidades y recomendaciones</div>
        {qbr.oportunidades.length === 0 && qbr.hallazgos.length === 0 ? (
          <p className="qbr-muted">Sin oportunidades ni hallazgos registrados en este período.</p>
        ) : (
          <>
            {qbr.oportunidades.map((o, i) => (
              <div key={`o${i}`} className="qbr-card">
                <b>{o.name}</b>{" "}
                {o.tipo && <span className="qbr-tag">{o.tipo}</span>}{" "}
                {o.impacto && <span className="qbr-tag">Impacto {o.impacto}</span>}{" "}
                <span className="qbr-muted">· {o.estado}</span>
              </div>
            ))}
            {qbr.hallazgos.map((h, i) => (
              <div key={`h${i}`} className="qbr-card">
                <b>{h.titulo}</b> <span className="qbr-tag">{h.tipo}</span>
                <div className="qbr-muted" style={{ marginTop: 4 }}>{h.recomendacion}</div>
                {h.servicio && <div style={{ marginTop: 4 }}><span className="qbr-tag">Servicio: {h.servicio}</span></div>}
              </div>
            ))}
          </>
        )}

        {/* Próximos pasos (IA) */}
        {qbr.narrativa && qbr.narrativa.proximosPasos.length > 0 && (
          <>
            <div className="qbr-h2">Próximos pasos</div>
            <ul className="qbr-ul">
              {qbr.narrativa.proximosPasos.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </>
        )}

        <div className="qbr-foot">
          BEXTechnology · Portal CSU — QBR generado el {new Date(qbr.generatedAt).toLocaleString("es-CO")}
          {qbr.reuniones.total > 0 ? ` · ${qbr.reuniones.total} reuniones registradas` : ""}
        </div>
      </div>
    </>
  )
}
