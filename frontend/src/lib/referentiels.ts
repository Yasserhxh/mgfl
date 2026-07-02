import { api } from "./api";
import { USE_REAL_API } from "./config";

/** Identifiant de référentiel (entier EF Core ou GUID selon le backend). */
export type RefId = number | string;

// --- DTOs & inputs (contrat API — les enums sont sérialisés en chaînes) ---

export interface ArticleDto {
  id: RefId;
  code: string;
  name: string;
  famille: string;
  referenceWeightPerCrate: number;
  referencePrice: number;
  taxUnitPrice: number;
}
export type ArticleInput = Omit<ArticleDto, "id">;

export type TransporterDirection = "Entrant" | "Sortant";

export interface TransporterDto {
  id: RefId;
  name: string;
  phone: string;
  direction: TransporterDirection;
}
export type TransporterInput = Omit<TransporterDto, "id">;

export interface VehicleDto {
  id: RefId;
  matricule: string;
  transporterId: RefId;
  transporterName: string;
  numeroCarteGrise: string;
  poidsTare: number;
}
export interface VehicleInput {
  matricule: string;
  transporterId: RefId;
  numeroCarteGrise: string;
  poidsTare: number;
}

export type BuyerType =
  | "Grossiste"
  | "Mandataire"
  | "CantineScolaire"
  | "Entreprise"
  | "Magasin"
  | "VendeurDetail";

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  Grossiste: "Grossiste",
  Mandataire: "Mandataire",
  CantineScolaire: "Cantine scolaire",
  Entreprise: "Entreprise",
  Magasin: "Magasin",
  VendeurDetail: "Vendeur au détail",
};

export interface BuyerDto {
  id: RefId;
  name: string;
  type: BuyerType;
}
export type BuyerInput = Omit<BuyerDto, "id">;

export type PackagingType = "Carton" | "Plastique" | "Bois";
export type PackagingCategorie = "Caisse" | "Palette" | "Sac";

export interface PackagingDto {
  id: RefId;
  type: PackagingType;
  categorie: PackagingCategorie;
  poids: number;
}
export type PackagingInput = Omit<PackagingDto, "id">;

export interface MerchandiseOwnerDto {
  id: RefId;
  name: string;
  phone: string;
}
export type MerchandiseOwnerInput = Omit<MerchandiseOwnerDto, "id">;

// --- Ressource CRUD générique (API en mode réel, mémoire en mode mock) ---

export interface Resource<TDto extends { id: RefId }, TInput> {
  list(): Promise<TDto[]>;
  create(input: TInput): Promise<TDto>;
  update(id: RefId, input: TInput): Promise<TDto>;
  remove(id: RefId): Promise<void>;
}

interface MockStore<TDto> {
  rows: TDto[];
}

function createResource<TDto extends { id: RefId }, TInput>(
  path: string,
  store: MockStore<TDto>,
  materialize: (input: TInput, id: RefId) => TDto,
): Resource<TDto, TInput> {
  if (USE_REAL_API) {
    return {
      list: () => api.get<TDto[]>(path).then((r) => r.data),
      create: (input) => api.post<TDto>(path, input).then((r) => r.data),
      update: (id, input) => api.put<TDto>(`${path}/${id}`, input).then((r) => r.data),
      remove: (id) => api.delete(`${path}/${id}`).then(() => undefined),
    };
  }
  let nextId =
    store.rows.reduce((max, r) => (typeof r.id === "number" && r.id > max ? r.id : max), 0) + 1;
  return {
    list: async () => store.rows.map((r) => ({ ...r })),
    create: async (input) => {
      const dto = materialize(input, nextId++);
      store.rows = [...store.rows, dto];
      return dto;
    },
    update: async (id, input) => {
      const dto = materialize(input, id);
      store.rows = store.rows.map((r) => (r.id === id ? dto : r));
      return dto;
    },
    remove: async (id) => {
      store.rows = store.rows.filter((r) => r.id !== id);
    },
  };
}

// --- Jeux de démo (mode mock) ---

const articleStore: MockStore<ArticleDto> = {
  rows: [
    { id: 1, code: "PDT", name: "Pomme de terre", famille: "Légumes", referenceWeightPerCrate: 30, referencePrice: 4, taxUnitPrice: 0.02 },
    { id: 2, code: "TOM", name: "Tomate", famille: "Légumes", referenceWeightPerCrate: 20, referencePrice: 6, taxUnitPrice: 0.025 },
    { id: 3, code: "OIG", name: "Oignon", famille: "Légumes", referenceWeightPerCrate: 25, referencePrice: 3, taxUnitPrice: 0.015 },
    { id: 4, code: "FRA", name: "Fraise", famille: "Fruits", referenceWeightPerCrate: 5, referencePrice: 20, taxUnitPrice: 0.03 },
    { id: 5, code: "ORG", name: "Orange", famille: "Fruits", referenceWeightPerCrate: 20, referencePrice: 5, taxUnitPrice: 0.02 },
  ],
};

const transporterStore: MockStore<TransporterDto> = {
  rows: [
    { id: 1, name: "Transport Atlas", phone: "0661-234567", direction: "Entrant" },
    { id: 2, name: "Sté. Nord Logistique", phone: "0662-889900", direction: "Entrant" },
    { id: 3, name: "Transport Chaouia", phone: "0663-445566", direction: "Sortant" },
  ],
};

function transporterNameOf(id: RefId): string {
  return transporterStore.rows.find((t) => t.id === id)?.name ?? "—";
}

const vehicleStore: MockStore<VehicleDto> = {
  rows: [
    { id: 1, matricule: "45821-A-6", transporterId: 1, transporterName: "Transport Atlas", numeroCarteGrise: "CG-778201", poidsTare: 3000 },
    { id: 2, matricule: "11902-B-3", transporterId: 2, transporterName: "Sté. Nord Logistique", numeroCarteGrise: "CG-334455", poidsTare: 3200 },
    { id: 3, matricule: "77410-C-1", transporterId: 3, transporterName: "Transport Chaouia", numeroCarteGrise: "CG-190228", poidsTare: 2800 },
  ],
};

const buyerStore: MockStore<BuyerDto> = {
  rows: [
    { id: 1, name: "Ets. Bennani", type: "Grossiste" },
    { id: 2, name: "Cantine Al Amal", type: "CantineScolaire" },
    { id: 3, name: "Sté. Alami", type: "Entreprise" },
  ],
};

const packagingStore: MockStore<PackagingDto> = {
  rows: [
    { id: 1, type: "Plastique", categorie: "Caisse", poids: 2 },
    { id: 2, type: "Carton", categorie: "Caisse", poids: 1.5 },
    { id: 3, type: "Bois", categorie: "Palette", poids: 25 },
    { id: 4, type: "Plastique", categorie: "Sac", poids: 0.3 },
  ],
};

const ownerStore: MockStore<MerchandiseOwnerDto> = {
  rows: [
    { id: 1, name: "Coopérative Souss Primeurs", phone: "0528-112233" },
    { id: 2, name: "Domaine El Haddaoui", phone: "0523-778899" },
  ],
};

// --- Ressources exportées ---

export const articlesResource = createResource<ArticleDto, ArticleInput>(
  "/api/articles",
  articleStore,
  (input, id) => ({ id, ...input }),
);

export const transportersResource = createResource<TransporterDto, TransporterInput>(
  "/api/transporters",
  transporterStore,
  (input, id) => ({ id, ...input }),
);

export const vehiclesResource = createResource<VehicleDto, VehicleInput>(
  "/api/vehicles",
  vehicleStore,
  (input, id) => ({ id, ...input, transporterName: transporterNameOf(input.transporterId) }),
);

export const buyersResource = createResource<BuyerDto, BuyerInput>(
  "/api/buyers",
  buyerStore,
  (input, id) => ({ id, ...input }),
);

export const packagingsResource = createResource<PackagingDto, PackagingInput>(
  "/api/packagings",
  packagingStore,
  (input, id) => ({ id, ...input }),
);

export const merchandiseOwnersResource = createResource<MerchandiseOwnerDto, MerchandiseOwnerInput>(
  "/api/merchandise-owners",
  ownerStore,
  (input, id) => ({ id, ...input }),
);
