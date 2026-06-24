"use client"

import { Controller } from "react-hook-form"
import { Field, Input, Textarea, Dropdown, Option, Switch } from "@fluentui/react-components"
import { useCatalog } from "@/components/catalog/CatalogProvider"

// Helpers de campos para los formularios de cliente (crear/editar).
// control loosely typed: reciben paths anidados dinámicos (contacts.0.x) que no
// encajan con el Control<FormValues> tipado de react-hook-form.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldCommon = { control: any; name: string; label: string; required?: boolean }

const reqRule = (required?: boolean) => (required ? { required: "Requerido" } : undefined)

export function TextF({
  control,
  name,
  label,
  required,
  type = "text",
  placeholder,
  disabled,
}: FieldCommon & {
  type?: "text" | "number" | "date" | "datetime-local" | "url" | "tel"
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <Controller
      control={control}
      name={name}
      rules={reqRule(required)}
      render={({ field, fieldState }) => (
        <Field label={label} required={required} validationMessage={fieldState.error?.message}>
          <Input
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            value={field.value ?? ""}
            onChange={(_, d) => field.onChange(d.value)}
            onBlur={field.onBlur}
          />
        </Field>
      )}
    />
  )
}

export function AreaF({ control, name, label }: FieldCommon) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label}>
          <Textarea value={field.value ?? ""} onChange={(_, d) => field.onChange(d.value)} resize="vertical" />
        </Field>
      )}
    />
  )
}

export function SelectF({
  control,
  name,
  label,
  required,
  catalogKey,
}: FieldCommon & { catalogKey: string }) {
  const options = useCatalog(catalogKey)
  return (
    <Controller
      control={control}
      name={name}
      rules={reqRule(required)}
      render={({ field, fieldState }) => (
        <Field label={label} required={required} validationMessage={fieldState.error?.message}>
          <Dropdown
            placeholder="Seleccionar…"
            value={field.value ?? ""}
            selectedOptions={field.value ? [field.value] : []}
            onOptionSelect={(_, d) => field.onChange(d.optionValue)}
            clearable
          >
            {options.map((o) => (
              <Option key={o} value={o}>
                {o}
              </Option>
            ))}
          </Dropdown>
        </Field>
      )}
    />
  )
}

export function SwitchF({ control, name, label }: FieldCommon) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Switch label={label} checked={!!field.value} onChange={(_, d) => field.onChange(d.checked)} />
      )}
    />
  )
}
