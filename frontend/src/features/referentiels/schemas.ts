import { z } from "zod/v3";
import type {
  ArticleInput,
  BuyerInput,
  BuyerType,
  MerchandiseOwnerInput,
  PackagingCategorie,
  PackagingInput,
  PackagingType,
  RefId,
  TransporterDirection,
  TransporterInput,
  VehicleInput,
} from "../../lib/referentiels";
import type { CrudSchema } from "./CrudSection";

// --- Enum option lists (shared by the schemas and the select fields) ---

export const DIRECTIONS = ["Entrant", "Sortant"] as const satisfies readonly TransporterDirection[];
export const BUYER_TYPES = [
  "Grossiste",
  "Mandataire",
  "CantineScolaire",
  "Entreprise",
  "Magasin",
  "VendeurDetail",
] as const satisfies readonly BuyerType[];
export const PACKAGING_TYPES = ["Carton", "Plastique", "Bois"] as const satisfies readonly PackagingType[];
export const PACKAGING_CATEGORIES = ["Caisse", "Palette", "Sac"] as const satisfies readonly PackagingCategorie[];

// --- Field helpers (raw form strings in, typed values out, French messages) ---

const requiredText = (label: string) =>
  z.string().trim().min(1, `Le champ « ${label} » est obligatoire.`);

const nonnegativeNumber = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Le champ « ${label} » est obligatoire.`)
    .pipe(
      z.coerce
        .number({ invalid_type_error: `Le champ « ${label} » doit être un nombre.` })
        .nonnegative(`Le champ « ${label} » doit être un nombre positif ou nul.`),
    );

const requiredEnum = <T extends string>(values: readonly [T, ...T[]], label: string) =>
  z.enum(values, { errorMap: () => ({ message: `Le champ « ${label} » est obligatoire.` }) });

// --- Per-resource schemas (one per Référentiels tab) ---

export const articleSchema: CrudSchema<ArticleInput> = z.object({
  code: requiredText("Code"),
  name: requiredText("Nom"),
  famille: requiredText("Famille"),
  referenceWeightPerCrate: nonnegativeNumber("Poids de référence / caisse"),
  referencePrice: nonnegativeNumber("Prix de référence"),
  taxUnitPrice: nonnegativeNumber("Prix unitaire de la taxe"),
});

export const transporterSchema: CrudSchema<TransporterInput> = z.object({
  name: requiredText("Nom"),
  phone: requiredText("Téléphone"),
  direction: requiredEnum(DIRECTIONS, "Sens"),
});

export const vehicleSchema: CrudSchema<VehicleInput> = z.object({
  matricule: requiredText("Matricule"),
  // The select holds the id as a string (integer EF Core id or GUID).
  transporterId: requiredText("Transporteur").transform<RefId>((raw) =>
    /^\d+$/.test(raw) ? Number(raw) : raw,
  ),
  numeroCarteGrise: requiredText("N° carte grise"),
  poidsTare: nonnegativeNumber("Poids tare"),
});

export const buyerSchema: CrudSchema<BuyerInput> = z.object({
  name: requiredText("Nom"),
  type: requiredEnum(BUYER_TYPES, "Type"),
});

export const packagingSchema: CrudSchema<PackagingInput> = z.object({
  type: requiredEnum(PACKAGING_TYPES, "Type"),
  categorie: requiredEnum(PACKAGING_CATEGORIES, "Catégorie"),
  poids: nonnegativeNumber("Poids"),
});

export const merchandiseOwnerSchema: CrudSchema<MerchandiseOwnerInput> = z.object({
  name: requiredText("Nom"),
  phone: requiredText("Téléphone"),
});
