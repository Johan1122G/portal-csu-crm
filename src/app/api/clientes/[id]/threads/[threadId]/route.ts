import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/api"
import { prisma } from "@/lib/prisma"

type Params = { params: { id: string; threadId: string } }

// GET — mensajes de una conversación.
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const thread = await prisma.insightThread.findFirst({
    where: { id: params.threadId, accountId: params.id },
    include: { messages: { orderBy: { createdon: "asc" } } },
  })
  if (!thread) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 })
  return NextResponse.json({
    id: thread.id,
    title: thread.title,
    messages: thread.messages.map((m) => ({ role: m.role, content: m.content })),
  })
}

// DELETE — elimina una conversación.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  await prisma.insightThread.deleteMany({ where: { id: params.threadId, accountId: params.id } })
  return NextResponse.json({ ok: true })
}
