import { describe, expect, it } from "vitest";
import {
  ArrivalBlockedError,
  checkPlausibility,
  getByCode,
  submitArrival,
} from "../store";

// Mock mode (VITE_API_MODE unset): plausibility uses CRATE_REF_WEIGHTS (±15%).

describe("checkPlausibility", () => {
  it("accepte un poids par caisse égal à la référence", () => {
    // Pomme de terre : 30 kg/caisse de référence — 3000 kg / 100 caisses = 30.
    const r = checkPlausibility("Pomme de terre", 3000, 100);
    expect(r.ok).toBe(true);
    expect(r.realPerCrate).toBe(30);
  });

  it("accepte un écart à la limite de la tolérance (±15 %)", () => {
    // 34,5 kg/caisse = +15 % exactement → toléré.
    expect(checkPlausibility("Pomme de terre", 3450, 100).ok).toBe(true);
    // 25,5 kg/caisse = −15 % exactement → toléré.
    expect(checkPlausibility("Pomme de terre", 2550, 100).ok).toBe(true);
  });

  it("bloque un écart hors tolérance avec un motif en français", () => {
    // 36 kg/caisse = +20 % → blocage.
    const r = checkPlausibility("Pomme de terre", 3600, 100);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("Pomme de terre");
    expect(r.reason).toContain("kg/caisse");
  });

  it("laisse passer un article sans poids de référence paramétré", () => {
    expect(checkPlausibility("Artichaut", 5000, 10).ok).toBe(true);
  });
});

describe("submitArrival (mode mock) — contrôle de vraisemblance BLOQUANT", () => {
  // PRE-2026-0043 (seed) : Pomme de terre, 12 t, statut « En attente ».
  const base = {
    code: "PRE-2026-0043",
    grossWeight: 15200,
    tareWeight: 3000,
    packagingWeight: 200,
    magasin: "M-01",
  };

  it("rejette sans persister quand le nombre de caisses est invraisemblable", async () => {
    // Net = 12 000 kg pour 100 caisses → 120 kg/caisse vs 30 de référence.
    await expect(
      submitArrival({ ...base, lines: [{ article: "Pomme de terre", crates: 100 }] }),
    ).rejects.toBeInstanceOf(ArrivalBlockedError);
    expect(getByCode(base.code)?.status).toBe("En attente");
  });

  it("persiste quand le nombre de caisses est plausible", async () => {
    // Net = 12 000 kg pour 400 caisses → 30 kg/caisse : conforme.
    const result = await submitArrival({
      ...base,
      lines: [{ article: "Pomme de terre", crates: 400 }],
    });
    expect(result.netWeight).toBe(12000);
    expect(getByCode(base.code)?.status).toBe("Pesé");
  });
});
