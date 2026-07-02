import { z } from "zod/v3";
import type { InfractionKind } from "../../lib/services";

export const INFRACTION_KINDS = [
  "Evasion",
  "ManqueDeclaration",
  "EmballageDifferent",
] as const satisfies readonly InfractionKind[];

const amountField = (label: string) =>
  z.coerce.number({ invalid_type_error: `Le ${label} doit être un nombre.` });

/**
 * Infraction form (§7.5) — the numeric fields required depend on the type:
 * ManqueDeclaration needs undeclaredWeight + articlePrice, the two other
 * kinds need taxAmount (mirrors the penalty formulas).
 */
export const infractionSchema = z
  .object({
    matricule: z.string().trim().min(1, "Le matricule du véhicule est obligatoire."),
    type: z.enum(INFRACTION_KINDS, {
      errorMap: () => ({ message: "Le type d'infraction est obligatoire." }),
    }),
    taxAmount: amountField("montant de la taxe"),
    undeclaredWeight: amountField("poids non déclaré"),
    articlePrice: amountField("prix d'article"),
  })
  .superRefine((v, ctx) => {
    if (v.type === "ManqueDeclaration") {
      if (!(v.undeclaredWeight > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["undeclaredWeight"],
          message: "Le poids non déclaré doit être strictement positif.",
        });
      }
      if (!(v.articlePrice > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["articlePrice"],
          message: "Le prix d'article doit être strictement positif.",
        });
      }
    } else if (!(v.taxAmount > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["taxAmount"],
        message: "Le montant de la taxe doit être strictement positif.",
      });
    }
  });

export type InfractionValues = z.infer<typeof infractionSchema>;
