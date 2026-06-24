"use client"

import { makeStyles, tokens } from "@fluentui/react-components"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import { CatalogProvider } from "@/components/catalog/CatalogProvider"

const useStyles = makeStyles({
  root: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  main: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  content: {
    flexGrow: 1,
    padding: tokens.spacingHorizontalXXL,
    overflowX: "auto",
  },
})

export function AppShell({
  user,
  children,
}: {
  user?: { name?: string | null; email?: string | null }
  children: React.ReactNode
}) {
  const styles = useStyles()
  return (
    <CatalogProvider>
      <div className={styles.root}>
        <Sidebar />
        <div className={styles.main}>
          <TopBar name={user?.name} email={user?.email} />
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </CatalogProvider>
  )
}
