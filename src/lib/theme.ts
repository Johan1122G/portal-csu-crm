import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from "@fluentui/react-components"

// Marca BEXT — rojo oscuro #8b2727 como tono 60 (primario).
const bexBrand: BrandVariants = {
  10: "#1a0505",
  20: "#2e0909",
  30: "#430e0e",
  40: "#5a1313",
  50: "#721818",
  60: "#8b2727",
  70: "#a33535",
  80: "#bb4545",
  90: "#d05858",
  100: "#e47070",
  110: "#ee8e8e",
  120: "#f5aaaa",
  130: "#f9c4c4",
  140: "#fcdcdc",
  150: "#feeaea",
  160: "#fff4f4",
}

export const bexLightTheme: Theme = createLightTheme(bexBrand)
export const bexDarkTheme: Theme = createDarkTheme(bexBrand)
