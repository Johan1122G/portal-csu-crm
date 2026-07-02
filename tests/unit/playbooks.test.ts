import { describe, it, expect } from "vitest"
import { PLAYBOOK_TEMPLATES, getPlaybookTemplate } from "@/lib/playbooks/templates"

const PRIORIDADES = ["Alta", "Media", "Baja"]

describe("PLAYBOOK_TEMPLATES — integridad", () => {
  it("tiene los playbooks esperados con keys únicas", () => {
    const keys = PLAYBOOK_TEMPLATES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(expect.arrayContaining(["recuperacion", "renovacion", "onboarding"]))
  })

  it("cada plantilla tiene título, descripción y al menos una tarea", () => {
    for (const t of PLAYBOOK_TEMPLATES) {
      expect(t.titulo).toBeTruthy()
      expect(t.descripcion).toBeTruthy()
      expect(t.tasks.length).toBeGreaterThan(0)
    }
  })

  it("cada tarea tiene offset >= 0 y prioridad válida", () => {
    for (const t of PLAYBOOK_TEMPLATES) {
      for (const task of t.tasks) {
        expect(task.titulo).toBeTruthy()
        expect(task.offsetDias).toBeGreaterThanOrEqual(0)
        expect(PRIORIDADES).toContain(task.prioridad)
      }
    }
  })
})

describe("getPlaybookTemplate", () => {
  it("resuelve una key existente", () => {
    expect(getPlaybookTemplate("recuperacion")?.titulo).toContain("Recuperación")
  })
  it("devuelve undefined para key inexistente", () => {
    expect(getPlaybookTemplate("no-existe")).toBeUndefined()
  })
})
