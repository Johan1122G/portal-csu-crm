import { PageHeader } from "@/components/shared/PageHeader"
import { ChurnView } from "@/components/churn/ChurnView"

export const dynamic = "force-dynamic"

export default function ChurnPage() {
  return (
    <>
      <PageHeader
        title="Riesgo de fuga"
        subtitle="Ranking de clientes por probabilidad de fuga, con los factores que más pesan"
      />
      <ChurnView />
    </>
  )
}
