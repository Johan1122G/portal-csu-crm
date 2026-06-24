"use client"

import { makeStyles, tokens, Title2, Body1 } from "@fluentui/react-components"

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalL,
    flexWrap: "wrap",
  },
  titles: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
  },
})

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  const styles = useStyles()
  return (
    <div className={styles.root}>
      <div className={styles.titles}>
        <Title2>{title}</Title2>
        {subtitle && <Body1 className={styles.subtitle}>{subtitle}</Body1>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
