import { PageHeader } from "@/components/shared/PageHeader"
import { DigestView } from "@/components/digest/DigestView"

export const dynamic = "force-dynamic"

export default function DigestPage() {
  return (
    <>
      <PageHeader title="Digest diario" subtitle="Lo que exige tu atención hoy — en toda la cartera" />
      <DigestView />
    </>
  )
}
