import { z } from "zod/v3";

/** Login form — both credentials are required (French UI messages). */
export const loginSchema = z.object({
  username: z.string().trim().min(1, "Le nom d'utilisateur est obligatoire."),
  password: z.string().min(1, "Le mot de passe est obligatoire."),
});

export type LoginValues = z.infer<typeof loginSchema>;
