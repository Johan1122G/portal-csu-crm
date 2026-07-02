import { PageHeader } from "@/components/shared/PageHeader"
import { BenchmarkView } from "@/components/benchmark/BenchmarkView"

export const dynamic = "force-dynamic"

export default function BenchmarkPage() {
  return (
    <>
      <PageHeader
        title="Benchmark por cohortes"
        subtitle="Cada cliente comparado con sus pares de industria — detección de outliers"
      />
      <BenchmarkView />
    </>
  )
}
