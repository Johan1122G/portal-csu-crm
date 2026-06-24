"use client"

import { Dropdown, Option } from "@fluentui/react-components"
import { useCatalog } from "./CatalogProvider"

// Dropdown controlado (para diálogos/filtros) cuyas opciones vienen del catálogo.
export function CatalogDropdown({
  catalogKey,
  value,
  onSelect,
  placeholder = "Seleccionar…",
  clearable = false,
}: {
  catalogKey: string
  value: string
  onSelect: (value: string) => void
  placeholder?: string
  clearable?: boolean
}) {
  const options = useCatalog(catalogKey)
  return (
    <Dropdown
      placeholder={placeholder}
      value={value}
      selectedOptions={value ? [value] : []}
      onOptionSelect={(_, d) => onSelect(d.optionValue ?? "")}
      clearable={clearable}
    >
      {options.map((o) => (
        <Option key={o} value={o}>
          {o}
        </Option>
      ))}
    </Dropdown>
  )
}
