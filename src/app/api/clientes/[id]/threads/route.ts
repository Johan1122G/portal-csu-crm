import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/api"
import { prisma } from "@/lib/prisma"

type Params = { params: { id: string } }

// GET /api/clientes/[id]/threads — lista de conversaciones guardadas (recientes primero).
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const threads = await prisma.insightThread.findMany({
    where: { accountId: params.id },
    orderBy: { modifiedon: "desc" },
    select: { id: true, title: true, modifiedon: true },
    take: 50,
  })
  return NextResponse.json({ threads })
}
