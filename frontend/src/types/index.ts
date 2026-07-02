export type LoadKind = "Emballe" | "Vrac";

export interface Article {
  id: string;
  code: string;
  name: string;
  famille?: string;
  referenceWeightPerCrate: number;
  referencePrice: number;
  taxUnitPrice: number;
}

export interface EtatDeBaseLineRequest {
  articleId: string;
  articleLabel: string;
  kind: LoadKind;
  referenceWeightPerCrate: number;
  referencePrice: number;
  taxUnitPrice: number;
  crateCount?: number | null;
  declaredWeight?: number | null;
  bulkPercentage?: number | null;
}

export interface EtatDeBaseRequest {
  totalDeclaredWeight: number;
  tolerance?: number | null;
  lines: EtatDeBaseLineRequest[];
}

export interface EtatDeBaseLineResponse {
  articleId: string;
  articleLabel: string;
  kind: string;
  crateCount?: number | null;
  netWeight: number;
  referencePrice: number;
  merchandiseValue: number;
  taxUnitPrice: number;
  adValoremTax: number;
}

export interface EtatDeBaseResponse {
  isBlocked: boolean;
  blockReasons: string[];
  lines: EtatDeBaseLineResponse[];
  totalNetWeight: number;
  totalMerchandiseValue: number;
  totalTax: number;
}
