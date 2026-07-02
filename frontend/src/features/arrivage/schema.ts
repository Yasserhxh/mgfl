import { z } from "zod/v3";
import { MAGASINS } from "../../lib/store";

/**
 * Optional crate count per declared line: an empty input parses to `undefined`
 * (never NaN — the preprocess strips empty values before coercion), otherwise
 * it must be a strictly positive integer.
 */
export const crateCountSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  },
  z.coerce
    .number({ invalid_type_error: "Le nombre de caisses doit être un nombre." })
    .int("Le nombre de caisses doit être un entier.")
    .positive("Le nombre de caisses doit être strictement positif.")
    .optional(),
);

const weightField = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `Le ${label} doit être un nombre.` })
    .nonnegative(`Le ${label} doit être positif ou nul.`);

/**
 * Weighing step at the weighbridge (§6.2) — the net weight
 * (gross − tare) − packaging must be strictly positive.
 */
export const weighingSchema = z
  .object({
    grossWeight: weightField("poids brut"),
    tareWeight: weightField("poids tare"),
    packagingWeight: weightField("poids d'emballage"),
    magasin: z.enum(MAGASINS, {
      errorMap: () => ({ message: "Le magasin réceptionnaire est obligatoire." }),
    }),
    lines: z.array(
      z.object({
        article: z.string(),
        crates: crateCountSchema,
      }),
    ),
  })
  .refine((v) => v.grossWeight - v.tareWeight - v.packagingWeight > 0, {
    message: "Le poids net doit être strictement positif : (brut − tare) − emballage > 0.",
    path: ["grossWeight"],
  });

/** Raw form values (crate counts may still be raw input strings). */
export type WeighingInput = z.input<typeof weighingSchema>;
/** Parsed values handed to the submit handler (numbers, crates or undefined). */
export type WeighingValues = z.output<typeof weighingSchema>;
