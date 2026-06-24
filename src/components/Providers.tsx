"use client"

import { useState } from "react"
import { useServerInsertedHTML } from "next/navigation"
import {
  createDOMRenderer,
  FluentProvider,
  RendererProvider,
  SSRProvider,
  renderToStyleElements,
} from "@fluentui/react-components"
import { bexLightTheme } from "@/lib/theme"

// Griffel (Fluent UI v9) needs its styles extracted during SSR so the first
// paint is already themed. This wires the renderer into Next's server-inserted
// HTML hook, the documented App Router integration pattern.
export function Providers({ children }: { children: React.ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer())

  useServerInsertedHTML(() => <>{renderToStyleElements(renderer)}</>)

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={bexLightTheme}>{children}</FluentProvider>
      </SSRProvider>
    </RendererProvider>
  )
}
