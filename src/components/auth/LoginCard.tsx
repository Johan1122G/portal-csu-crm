"use client"

import { signIn } from "next-auth/react"
import {
  makeStyles,
  tokens,
  Card,
  Button,
  Title3,
  Body1,
  Text,
} from "@fluentui/react-components"

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  card: {
    width: "100%",
    maxWidth: "380px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalXXL,
  },
  brandMark: {
    width: "56px",
    height: "56px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase500,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalXS,
    textAlign: "center",
  },
})

export function LoginCard({ devBypass = false }: { devBypass?: boolean }) {
  const styles = useStyles()
  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.brandMark}>CSU</div>
        <div className={styles.header}>
          <Title3>Portal CSU</Title3>
          <Body1>Customer Success y Soporte</Body1>
        </div>
        <Button
          appearance="primary"
          size="large"
          style={{ width: "100%" }}
          onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}
        >
          Iniciar sesión con Microsoft
        </Button>
        {devBypass && (
          <Button
            appearance="secondary"
            size="large"
            style={{ width: "100%" }}
            onClick={() => signIn("dev-bypass", { callbackUrl: "/" })}
          >
            Entrar como dev (local)
          </Button>
        )}
        <Text size={200} align="center" style={{ color: tokens.colorNeutralForeground3 }}>
          Acceso restringido a cuentas de BEXTechnology S.A.S.
        </Text>
      </Card>
    </div>
  )
}
