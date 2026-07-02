import { describe, expect, it } from "vitest";
import { loginSchema } from "../auth/schema";
import { preDeclarationSchema } from "../pre-declaration/schema";
import { crateCountSchema, weighingSchema } from "../arrivage/schema";
import { reservationSchema } from "../emplacements/schema";
import { priceRowSchema } from "../prix-reference/schema";
import { infractionSchema } from "../infractions/schema";

describe("weighingSchema (arrivage)", () => {
  const valid = {
    grossWeight: "10200",
    tareWeight: "3000",
    packagingWeight: "200",
    magasin: "M-01",
    lines: [{ article: "Tomate", crates: "350" }],
  };

  it("accepte une pesée valide et coerce les nombres", () => {
    const result = weighingSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.grossWeight).toBe(10200);
      expect(result.data.lines[0].crates).toBe(350);
    }
  });

  it("rejette un poids net <= 0 ((brut − tare) − emballage)", () => {
    const result = weighingSchema.safeParse({ ...valid, grossWeight: "3200" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["grossWeight"]);
      expect(result.error.issues[0].message).toContain("poids net");
    }
  });

  it("transforme un nombre de caisses vide en undefined (jamais NaN)", () => {
    const result = weighingSchema.safeParse({
      ...valid,
      lines: [{ article: "Tomate", crates: "" }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.lines[0].crates).toBeUndefined();
  });

  it("rejette un nombre de caisses nul ou non entier", () => {
    expect(crateCountSchema.safeParse("0").success).toBe(false);
    expect(crateCountSchema.safeParse("2.5").success).toBe(false);
    expect(crateCountSchema.safeParse("12").success).toBe(true);
  });
});

describe("reservationSchema (emplacements)", () => {
  it("rejette une date de fin antérieure à la date de début", () => {
    const result = reservationSchema.safeParse({
      merchant: "Ets. Bennani",
      debut: "2026-07-03",
      fin: "2026-07-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["fin"]);
    }
  });

  it("accepte une période valide (fin = debut incluse) et trim le commerçant", () => {
    const result = reservationSchema.safeParse({
      merchant: "  Ets. Bennani  ",
      debut: "2026-07-01",
      fin: "2026-07-01",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.merchant).toBe("Ets. Bennani");
  });

  it("rejette un commerçant vide", () => {
    const result = reservationSchema.safeParse({ merchant: "  ", debut: "2026-07-01", fin: "2026-07-02" });
    expect(result.success).toBe(false);
  });
});

describe("priceRowSchema (prix de référence)", () => {
  const row = { code: "PDT", name: "Pomme de terre", min: "3.5", max: "4.5", taxRate: "0.02" };

  it("rejette une ligne avec prix max < prix min", () => {
    const result = priceRowSchema.safeParse({ ...row, max: "2" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["max"]);
    }
  });

  it("accepte une ligne valide et coerce les nombres", () => {
    const result = priceRowSchema.safeParse(row);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toMatchObject({ min: 3.5, max: 4.5, taxRate: 0.02 });
  });

  it("rejette un prix négatif", () => {
    expect(priceRowSchema.safeParse({ ...row, min: "-1" }).success).toBe(false);
  });
});

describe("loginSchema (auth)", () => {
  it("exige le nom d'utilisateur et le mot de passe", () => {
    const result = loginSchema.safeParse({ username: "  ", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("username");
      expect(paths).toContain("password");
    }
  });
});

describe("preDeclarationSchema (pré-déclaration)", () => {
  const valid = {
    matricule: "12345-A-6",
    transporteur: "Transport Atlas",
    source: "Souss-Massa (Agadir)",
    items: [{ article: "Tomate", tonnage: "8" }],
  };

  it("accepte une déclaration valide", () => {
    const result = preDeclarationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.items[0].tonnage).toBe(8);
  });

  it("rejette un tonnage nul et une liste d'articles vide", () => {
    expect(
      preDeclarationSchema.safeParse({ ...valid, items: [{ article: "Tomate", tonnage: "0" }] }).success,
    ).toBe(false);
    expect(preDeclarationSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });
});

describe("infractionSchema (infractions)", () => {
  const base = {
    matricule: "12345-A-6",
    taxAmount: "240",
    undeclaredWeight: "500",
    articlePrice: "4",
  };

  it("exige un montant de taxe positif pour une évasion", () => {
    const result = infractionSchema.safeParse({ ...base, type: "Evasion", taxAmount: "0" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["taxAmount"]);
  });

  it("exige poids non déclaré et prix d'article pour un manque de déclaration", () => {
    const result = infractionSchema.safeParse({
      ...base,
      type: "ManqueDeclaration",
      undeclaredWeight: "0",
      articlePrice: "0",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("undeclaredWeight");
      expect(paths).toContain("articlePrice");
    }
  });

  it("accepte une infraction valide de chaque type", () => {
    expect(infractionSchema.safeParse({ ...base, type: "Evasion" }).success).toBe(true);
    expect(infractionSchema.safeParse({ ...base, type: "EmballageDifferent" }).success).toBe(true);
    expect(infractionSchema.safeParse({ ...base, type: "ManqueDeclaration" }).success).toBe(true);
  });
});
