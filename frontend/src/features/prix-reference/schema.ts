import { z } from "zod/v3";

const nonnegative = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `Le ${label} doit être un nombre.` })
    .nonnegative(`Le ${label} doit être positif ou nul.`);

/** One row of the weekly grid — nonnegative prices with max >= min (row-level). */
export const priceRowSchema = z
  .object({
    code: z.string(),
    name: z.string(),
    min: nonnegative("prix min"),
    max: nonnegative("prix max"),
    taxRate: nonnegative("prix de la taxe"),
  })
  .refine((r) => r.max >= r.min, {
    message: "Le prix max doit être supérieur ou égal au prix min.",
    path: ["max"],
  });

/** Whole weekly grid published by the commission (§7.4). */
export const prixGridSchema = z.object({
  rows: z.array(priceRowSchema).min(1, "La grille doit contenir au moins un article."),
});

export type PrixGridValues = z.infer<typeof prixGridSchema>;
