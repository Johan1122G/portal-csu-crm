import JSZip from "jszip"

// Empaqueta el bundle de CSVs en un ZIP (omite archivos vacíos).
// Devuelve ArrayBuffer: es un BodyInit válido directo para NextResponse.
export async function bundleToZip(bundle: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip()
  for (const [name, content] of Object.entries(bundle)) {
    if (content && content.trim()) zip.file(name, content)
  }
  return zip.generateAsync({ type: "arraybuffer" })
}
