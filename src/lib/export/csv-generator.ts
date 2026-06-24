import Papa from "papaparse"
import type { AccountWithRelations } from "@/types"
import { flattenAccountsToD365 } from "./d365-mapper"

// Genera el bundle de 5 CSVs D365 a partir de una o varias cuentas.
// Sirve tanto para el export de un cliente como para el export masivo.
export function generateD365CsvBundle(
  accounts: AccountWithRelations[],
): Record<string, string> {
  const flat = flattenAccountsToD365(accounts)
  return {
    "accounts.csv": Papa.unparse(flat.accounts),
    "contacts.csv": Papa.unparse(flat.contacts),
    "activities.csv": Papa.unparse(flat.activities),
    "opportunities.csv": Papa.unparse(flat.opportunities),
    "contracts.csv": Papa.unparse(flat.contracts),
  }
}
