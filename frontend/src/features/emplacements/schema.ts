import { z } from "zod/v3";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Spot reservation form (§6.4) — merchant + ISO date range with fin >= debut. */
export const reservationSchema = z
  .object({
    merchant: z.string().trim().min(1, "Le nom du commerçant est requis."),
    debut: z.string().regex(ISO_DATE, "La date de début est requise."),
    fin: z.string().regex(ISO_DATE, "La date de fin est requise."),
  })
  .refine((v) => v.fin >= v.debut, {
    message: "La date de fin doit être postérieure ou égale à la date de début.",
    path: ["fin"],
  });

export type ReservationValues = z.infer<typeof reservationSchema>;
