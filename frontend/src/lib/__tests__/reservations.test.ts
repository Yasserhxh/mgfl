import { beforeEach, describe, expect, it } from "vitest";
import {
  DAILY_RATE,
  createReservation,
  endReservation,
  getReservations,
  getSpots,
  reservationDays,
  reservationFee,
  resetMockReservations,
} from "../reservations";

// These tests run in mock mode (VITE_API_MODE is unset): the store is in-memory.

describe("règle de frais de réservation (§6.4)", () => {
  it("compte 1 jour pour une réservation d'une seule journée (début = fin)", () => {
    expect(reservationDays("2026-07-02", "2026-07-02")).toBe(1);
    expect(reservationFee("2026-07-02", "2026-07-02")).toBe(1 * DAILY_RATE);
  });

  it("compte les jours de façon inclusive sur plusieurs jours", () => {
    expect(reservationDays("2026-07-01", "2026-07-03")).toBe(3);
    expect(reservationFee("2026-07-01", "2026-07-03")).toBe(3 * 250);
  });

  it("gère le passage de mois (inclusif)", () => {
    expect(reservationDays("2026-06-29", "2026-07-02")).toBe(4);
    expect(reservationFee("2026-06-29", "2026-07-02")).toBe(1000);
  });

  it("clampe à 1 jour minimum quand fin < début (le formulaire rejette ce cas en amont)", () => {
    expect(reservationDays("2026-07-05", "2026-07-01")).toBe(1);
    expect(reservationFee("2026-07-05", "2026-07-01")).toBe(DAILY_RATE);
  });
});

describe("store mock des réservations", () => {
  beforeEach(() => {
    resetMockReservations();
  });

  it("seed cohérent : frais = jours × tarif journalier, emplacements Réservé alignés", () => {
    for (const r of getReservations()) {
      expect(r.fee).toBe(r.days * DAILY_RATE);
      const spot = getSpots().find((s) => s.id === r.spotId);
      expect(spot?.status).toBe("Réservé");
      expect(spot?.reservedBy).toBe(r.merchant);
      expect(spot?.fee).toBe(r.fee);
    }
  });

  it("créer une réservation passe l'emplacement à « Réservé » et calcule les frais", async () => {
    const before = getSpots().find((s) => s.id === "M-03-A");
    expect(before?.status).toBe("Libre");

    const r = await createReservation({
      spotId: "M-03-A",
      merchant: "Coopérative Al Baraka",
      debut: "2026-07-02",
      fin: "2026-07-04",
    });

    expect(r.status).toBe("Active");
    expect(r.days).toBe(3);
    expect(r.fee).toBe(750);
    expect(r.store).toBe("M-03");
    expect(r.bay).toBe("A");

    const spot = getSpots().find((s) => s.id === "M-03-A");
    expect(spot?.status).toBe("Réservé");
    expect(spot?.reservedBy).toBe("Coopérative Al Baraka");
    expect(spot?.fee).toBe(750);
    expect(getReservations().some((x) => x.id === r.id)).toBe(true);
  });

  it("refuse de réserver un emplacement non libre (parité avec le 409 du backend)", async () => {
    await expect(
      createReservation({ spotId: "M-01-A", merchant: "Test", debut: "2026-07-02", fin: "2026-07-02" }),
    ).rejects.toThrow("n'est pas libre");
    // Aucun changement d'état.
    expect(getSpots().find((s) => s.id === "M-01-A")?.status).toBe("Occupé");
  });

  it("terminer une réservation libère l'emplacement", async () => {
    const r = await createReservation({
      spotId: "M-06-B",
      merchant: "Ets. Idrissi",
      debut: "2026-07-02",
      fin: "2026-07-03",
    });

    const ended = await endReservation(r.id);
    expect(ended.status).toBe("Terminée");

    const spot = getSpots().find((s) => s.id === "M-06-B");
    expect(spot?.status).toBe("Libre");
    expect(spot?.reservedBy).toBeUndefined();
    expect(spot?.fee).toBeUndefined();
    expect(getReservations().find((x) => x.id === r.id)?.status).toBe("Terminée");
  });
});
