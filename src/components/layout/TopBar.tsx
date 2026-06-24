"use client"

import { signOut } from "next-auth/react"
import {
  makeStyles,
  tokens,
  Avatar,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Button,
} from "@fluentui/react-components"
import { SignOut24Regular } from "@fluentui/react-icons"

const useStyles = makeStyles({
  root: {
    height: "56px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalM,
    padding: `0 ${tokens.spacingHorizontalXL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
})

export function TopBar({ name, email }: { name?: string | null; email?: string | null }) {
  const styles = useStyles()
  const label = name ?? email ?? "Usuario"

  return (
    <header className={styles.root}>
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button appearance="transparent" icon={<Avatar name={label} color="colorful" size={28} />}>
            {label}
          </Button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem
              icon={<SignOut24Regular />}
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Cerrar sesión
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    </header>
  )
}
