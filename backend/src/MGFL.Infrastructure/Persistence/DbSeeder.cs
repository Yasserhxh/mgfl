using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;
using MGFL.Domain.Enums;
using MGFL.Domain.Services;

namespace MGFL.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(MgflDbContext db)
    {
        // Relational (SQL Server) : apply migrations; InMemory : create the model directly.
        if (db.Database.IsRelational()) await db.Database.MigrateAsync();
        else await db.Database.EnsureCreatedAsync();
        await SeedUsersAsync(db);
        if (await db.Articles.AnyAsync()) return;

        // --- Articles (référentiel + prix courant) ---
        var articles = new[]
        {
            new Article { Code = "PDT", Name = "Pomme de terre", Famille = "Tubercules", ReferenceWeightPerCrate = 30m, ReferencePrice = 4m, TaxUnitPrice = 0.02m },
            new Article { Code = "TOM", Name = "Tomate", Famille = "Légumes", ReferenceWeightPerCrate = 20m, ReferencePrice = 6m, TaxUnitPrice = 0.025m },
            new Article { Code = "OIG", Name = "Oignon", Famille = "Légumes", ReferenceWeightPerCrate = 25m, ReferencePrice = 3m, TaxUnitPrice = 0.015m },
            new Article { Code = "FRA", Name = "Fraise", Famille = "Fruits", ReferenceWeightPerCrate = 5m, ReferencePrice = 20m, TaxUnitPrice = 0.03m },
            new Article { Code = "CGT", Name = "Courgette", Famille = "Légumes", ReferenceWeightPerCrate = 18m, ReferencePrice = 5m, TaxUnitPrice = 0.02m },
            new Article { Code = "CAR", Name = "Carotte", Famille = "Légumes", ReferenceWeightPerCrate = 22m, ReferencePrice = 3.5m, TaxUnitPrice = 0.018m },
            new Article { Code = "POI", Name = "Poivron", Famille = "Légumes", ReferenceWeightPerCrate = 12m, ReferencePrice = 7m, TaxUnitPrice = 0.022m },
            new Article { Code = "ORA", Name = "Orange", Famille = "Fruits", ReferenceWeightPerCrate = 20m, ReferencePrice = 5m, TaxUnitPrice = 0.02m },
        };
        db.Articles.AddRange(articles);

        // --- Historique des prix (dernière mise à jour = jeudi précédent) ---
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var lastThursday = today.AddDays(-(((int)today.DayOfWeek - (int)DayOfWeek.Thursday + 7) % 7));
        foreach (var a in articles)
            db.ReferencePrices.Add(new ReferencePriceHistory
            {
                Article = a,
                PrixMin = Math.Round(a.ReferencePrice * 0.9m, 2),
                PrixMax = Math.Round(a.ReferencePrice * 1.1m, 2),
                PrixUnitaireTaxe = a.TaxUnitPrice,
                DateEffet = lastThursday,
            });

        db.Buyers.AddRange(
            new Buyer { Name = "Ets. Bennani", Type = BuyerType.Grossiste },
            new Buyer { Name = "Marjane Holding", Type = BuyerType.Entreprise },
            new Buyer { Name = "Cantine Lycée Al Khawarizmi", Type = BuyerType.CantineScolaire });

        db.MerchandiseOwners.AddRange(
            new MerchandiseOwner { Name = "Coopérative Souss Primeurs", Phone = "0528000000" },
            new MerchandiseOwner { Name = "Domaine Alami", Phone = "0523000000" });

        db.Packagings.AddRange(
            new Packaging { Type = PackagingType.Plastique, Categorie = PackagingCategory.Caisse, Poids = 1.8m },
            new Packaging { Type = PackagingType.Bois, Categorie = PackagingCategory.Palette, Poids = 22m },
            new Packaging { Type = PackagingType.Carton, Categorie = PackagingCategory.Caisse, Poids = 0.6m });

        var wb = new Weighbridge { Code = "PB-01", Name = "Pont à Bascule Nord" };
        db.Weighbridges.Add(wb);

        var transporter = new Transporter { Name = "Transports Atlas", Phone = "0600000000" };
        db.Transporters.Add(transporter);
        db.Vehicles.Add(new Vehicle { Matricule = "12345-A-6", Transporter = transporter, NumeroCarteGrise = "CG-998877", PoidsTare = 3000m });

        // --- Magasins M-01..M-06, 2 emplacements (A/B) chacun ---
        var spotPreset = new (string store, SpotStatus a, string? aInfo, decimal? aFee, SpotStatus b, string? bInfo, decimal? bFee)[]
        {
            ("M-01", SpotStatus.Occupe, "45821-A-6", null, SpotStatus.Libre, null, null),
            ("M-02", SpotStatus.Reserve, "Ets. Bennani", 500m, SpotStatus.Occupe, "11902-B-3", null),
            ("M-03", SpotStatus.Libre, null, null, SpotStatus.Libre, null, null),
            ("M-04", SpotStatus.Occupe, "77410-C-1", null, SpotStatus.Reserve, "Sté. Alami", 250m),
            ("M-05", SpotStatus.Libre, null, null, SpotStatus.Occupe, "20933-A-9", null),
            ("M-06", SpotStatus.Libre, null, null, SpotStatus.Libre, null, null),
        };
        var premisesList = new List<Premises>();
        foreach (var s in spotPreset)
        {
            var p = new Premises { Code = s.store, Type = PremisesType.Magasin, SpotCount = 2 };
            p.Spots.Add(MakeSpot("A", s.a, s.aInfo, s.aFee));
            p.Spots.Add(MakeSpot("B", s.b, s.bInfo, s.bFee));
            db.Premises.Add(p);
            premisesList.Add(p);
        }

        // Réservations actives cohérentes avec les emplacements "Réservé" (tarif 250 MAD/jour).
        const decimal dailyRate = 250m;
        foreach (var spot in premisesList.SelectMany(p => p.Spots).Where(s => s.Status == SpotStatus.Reserve))
        {
            var days = (int)((spot.ReservationFee ?? dailyRate) / dailyRate);
            db.SpotReservations.Add(new SpotReservation
            {
                ParkingSpot = spot,
                Merchant = spot.ReservedBy!,
                Debut = today,
                Fin = today.AddDays(Math.Max(0, days - 1)),
                Fee = spot.ReservationFee ?? dailyRate,
                Status = ReservationStatus.Active,
            });
        }

        // --- Pré-déclarations de démonstration ---
        db.PreDeclarations.AddRange(
            new PreDeclaration
            {
                QrCode = "PRE-2026-0042", Matricule = "45821-A-6", Transporteur = "Transport Atlas",
                CreatedByUsername = "transporteur",
                Source = "Souss-Massa (Agadir)", Status = PreDeclarationStatus.Cloture, IsConsumed = true,
                PesageNetWeight = 7850m, PesageTax = 196.25m, Magasin = "M-02",
                Lines = { new PreDeclarationLine { ArticleName = "Tomate", TonnageApprox = 8m } },
            },
            new PreDeclaration
            {
                QrCode = "PRE-2026-0043", Matricule = "11902-B-3", Transporteur = "Sté. Nord Logistique",
                Source = "Gharb (Kénitra)", Status = PreDeclarationStatus.EnAttente,
                Lines = { new PreDeclarationLine { ArticleName = "Pomme de terre", TonnageApprox = 12m } },
            },
            new PreDeclaration
            {
                QrCode = "PRE-2026-0044", Matricule = "77410-C-1", Transporteur = "Transport Chaouia",
                Source = "Doukkala (El Jadida)", Status = PreDeclarationStatus.EnAttente,
                Lines =
                {
                    new PreDeclarationLine { ArticleName = "Oignon", TonnageApprox = 6m },
                    new PreDeclarationLine { ArticleName = "Carotte", TonnageApprox = 3m },
                },
            });

        // --- Infractions de démonstration ---
        db.Infractions.AddRange(
            new Infraction { Reference = "INF-2026-011", Matricule = "45821-A-6", Type = InfractionType.Evasion, Amount = 480m },
            new Infraction { Reference = "INF-2026-012", Matricule = "11902-B-3", Type = InfractionType.ManqueDeclaration, Amount = 1600m });

        await db.SaveChangesAsync();
    }

    // Comptes de démonstration — un par rôle. Mots de passe à changer hors environnement de dev.
    private static async Task SeedUsersAsync(MgflDbContext db)
    {
        if (await db.Users.AnyAsync()) return;
        db.Users.AddRange(
            MakeUser("admin", "Administrateur", Roles.Admin, "Admin@2026"),
            MakeUser("agent.pab", "Agent Pont à Bascule", Roles.AgentPontBascule, "Pesage@2026"),
            MakeUser("agent.orga", "Agent d'Organisation", Roles.AgentOrganisation, "Parking@2026"),
            MakeUser("commission", "Commission des Prix", Roles.CommissionPrix, "Prix@2026"),
            MakeUser("commercant", "Commerçant Bennani", Roles.Commercant, "Marche@2026"),
            MakeUser("transporteur", "Transports Atlas", Roles.Transporteur, "Route@2026"));
        await db.SaveChangesAsync();
    }

    private static AppUser MakeUser(string username, string fullName, string role, string password) => new()
    {
        Username = username,
        FullName = fullName,
        Role = role,
        PasswordHash = PasswordHasher.Hash(password),
    };

    private static ParkingSpot MakeSpot(string bay, SpotStatus status, string? info, decimal? fee) => new()
    {
        Code = bay,
        Status = status,
        OccupiedByMatricule = status == SpotStatus.Occupe ? info : null,
        ReservedBy = status == SpotStatus.Reserve ? info : null,
        ReservationFee = status == SpotStatus.Reserve ? fee : null,
    };
}
