import { z } from "zod/v3";
import { SOURCES } from "../../lib/store";

/** One declared article line: article required + strictly positive approximate tonnage. */
export const preDeclarationItemSchema = z.object({
  article: z.string().trim().min(1, "L'article est obligatoire."),
  tonnage: z.coerce
    .number({ invalid_type_error: "Le tonnage doit être un nombre." })
    .positive("Le tonnage doit être strictement positif."),
});

/** Mobile pre-declaration form (§6.1) — vehicle, source and at least one article line. */
export const preDeclarationSchema = z.object({
  matricule: z
    .string()
    .trim()
    .min(1, "Le matricule du véhicule est obligatoire.")
    .regex(/\d{3,}/, "Matricule invalide — ex. 12345-A-6."),
  transporteur: z.string().trim().min(2, "Le nom du transporteur est obligatoire."),
  source: z.enum(SOURCES, {
    errorMap: () => ({ message: "La source de marchandises est obligatoire." }),
  }),
  items: z.array(preDeclarationItemSchema).min(1, "Au moins un article est requis."),
});

export type PreDeclarationValues = z.infer<typeof preDeclarationSchema>;
