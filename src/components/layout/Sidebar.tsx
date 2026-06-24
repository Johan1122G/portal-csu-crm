"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { makeStyles, tokens, Text, mergeClasses } from "@fluentui/react-components"
import {
  Home24Regular,
  Home24Filled,
  People24Regular,
  People24Filled,
  TaskListSquareLtr24Regular,
  TaskListSquareLtr24Filled,
  Lightbulb24Regular,
  Lightbulb24Filled,
  PulseSquare24Regular,
  PulseSquare24Filled,
  Settings24Regular,
  Settings24Filled,
} from "@fluentui/react-icons"

type NavEntry = {
  href: string
  label: string
  Icon: React.FC
  IconActive: React.FC
}

const NAV: NavEntry[] = [
  { href: "/", label: "Dashboard", Icon: Home24Regular, IconActive: Home24Filled },
  { href: "/clientes", label: "Clientes", Icon: People24Regular, IconActive: People24Filled },
  {
    href: "/actividades",
    label: "Gestiones CS",
    Icon: TaskListSquareLtr24Regular,
    IconActive: TaskListSquareLtr24Filled,
  },
  {
    href: "/oportunidades",
    label: "Oportunidades",
    Icon: Lightbulb24Regular,
    IconActive: Lightbulb24Filled,
  },
  {
    href: "/cartera",
    label: "Cartera (IA)",
    Icon: PulseSquare24Regular,
    IconActive: PulseSquare24Filled,
  },
  { href: "/configuracion", label: "Configuración", Icon: Settings24Regular, IconActive: Settings24Filled },
]

const useStyles = makeStyles({
  root: {
    width: "240px",
    flexShrink: 0,
    height: "100vh",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
  },
  brandMark: {
    width: "32px",
    height: "32px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase300,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    padding: tokens.spacingHorizontalS,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalSNudge} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    textDecoration: "none",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground2Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  itemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontWeight: tokens.fontWeightSemibold,
    ":hover": {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
})

export function Sidebar() {
  const styles = useStyles()
  const pathname = usePathname()

  return (
    <aside className={styles.root}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>CSU</div>
        <Text weight="semibold" size={400}>
          Portal CSU
        </Text>
      </div>
      <nav className={styles.nav}>
        {NAV.map(({ href, label, Icon, IconActive }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
          const Glyph = active ? IconActive : Icon
          return (
            <Link
              key={href}
              href={href}
              className={mergeClasses(styles.item, active && styles.itemActive)}
            >
              <Glyph />
              <Text>{label}</Text>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
