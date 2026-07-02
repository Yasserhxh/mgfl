/*
  MGFL - Donnees de demarrage (miroir de DbSeeder.cs).
  Executer APRES schema.sql sur la base cible. Idempotent : chaque bloc
  ne s'execute que si la table correspondante est vide.

  Comptes de demonstration (mot de passe en clair -> hash PBKDF2 ci-dessous) :
    admin / Admin@2026, agent.pab / Pesage@2026, agent.orga / Parking@2026,
    commission / Prix@2026, commercant / Marche@2026, transporteur / Route@2026
  ATTENTION : comptes de dev uniquement - changer les mots de passe hors dev.
*/
SET NOCOUNT ON;
GO

------------------------------------------------------------------------------
-- Utilisateurs (PBKDF2 SHA-256, format "iterations.sel.hash")
------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [Users])
BEGIN
    INSERT INTO [Users] ([Id], [Username], [FullName], [PasswordHash], [Role], [IsActive], [CreatedAt])
    VALUES
    ('10000000-0000-0000-0000-000000000001', N'admin',        N'Administrateur',        N'100000.0FGnS83++zMsKaNFA2Q6sQ==.1xSD7Jw54ll9OZd06PwlPCMg1n8Ei7I8C68kl+WGqwQ=', N'Admin',             1, SYSDATETIMEOFFSET()),
    ('10000000-0000-0000-0000-000000000002', N'agent.pab',    N'Agent Pont à Bascule',  N'100000.yKKRjGH6EKDdII8euPWAWA==.VdtDwuIyQ88kOkm4/JeO+2eJaghCefW9aTGFt8Kacm4=', N'AgentPontBascule',  1, SYSDATETIMEOFFSET()),
    ('10000000-0000-0000-0000-000000000003', N'agent.orga',   N'Agent d''Organisation', N'100000.2ipV0W2vBCu7KnLJrQoJyw==.KoLDE3UzOQN+LubdbeY9QCO8XmEIc/uXHUSPblNW3L0=', N'AgentOrganisation', 1, SYSDATETIMEOFFSET()),
    ('10000000-0000-0000-0000-000000000004', N'commission',   N'Commission des Prix',   N'100000.S/w1DMZCpvQslnwpScPOVw==./IcD0WaCCq7a1nAxRzlj72bd7Nvf/zSukfZUM9NNZXg=', N'CommissionPrix',    1, SYSDATETIMEOFFSET()),
    ('10000000-0000-0000-0000-000000000005', N'commercant',   N'Commerçant Bennani',    N'100000.ZLYD6odpa9MRpV72XfQfRA==.sazo7I9txZV6pmEcRbOUnG/UHbSyuPf9YARjcj6wscw=', N'Commercant',        1, SYSDATETIMEOFFSET()),
    ('10000000-0000-0000-0000-000000000006', N'transporteur', N'Transports Atlas',      N'100000.9Qn3ROz8TVvKISnZkpSWVg==.Li0RIJP8cggod7mj1T708AZ0FMpsgvEqPObONbj9BuU=', N'Transporteur',      1, SYSDATETIMEOFFSET());
END
GO

------------------------------------------------------------------------------
-- Referentiels + donnees transactionnelles de demonstration
------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [Articles])
BEGIN
    -- Articles (poids de reference par caisse, prix courant, prix de la taxe)
    INSERT INTO [Articles] ([Id], [Code], [Name], [Famille], [ReferenceWeightPerCrate], [ReferencePrice], [TaxUnitPrice], [CreatedAt])
    VALUES
    ('20000000-0000-0000-0000-000000000001', N'PDT', N'Pomme de terre', N'Tubercules', 30, 4,   0.020, SYSDATETIMEOFFSET()),
    ('20000000-0000-0000-0000-000000000002', N'TOM', N'Tomate',         N'Légumes',    20, 6,   0.025, SYSDATETIMEOFFSET()),
    ('20000000-0000-0000-0000-000000000003', N'OIG', N'Oignon',         N'Légumes',    25, 3,   0.015, SYSDATETIMEOFFSET()),
    ('20000000-0000-0000-0000-000000000004', N'FRA', N'Fraise',         N'Fruits',      5, 20,  0.030, SYSDATETIMEOFFSET()),
    ('20000000-0000-0000-0000-000000000005', N'CGT', N'Courgette',      N'Légumes',    18, 5,   0.020, SYSDATETIMEOFFSET()),
    ('20000000-0000-0000-0000-000000000006', N'CAR', N'Carotte',        N'Légumes',    22, 3.5, 0.018, SYSDATETIMEOFFSET()),
    ('20000000-0000-0000-0000-000000000007', N'POI', N'Poivron',        N'Légumes',    12, 7,   0.022, SYSDATETIMEOFFSET()),
    ('20000000-0000-0000-0000-000000000008', N'ORA', N'Orange',         N'Fruits',     20, 5,   0.020, SYSDATETIMEOFFSET());

    -- Historique des prix (derniere publication hebdomadaire = jeudi precedent)
    DECLARE @effet date = DATEADD(DAY, -((DATEDIFF(DAY, '2026-01-01', CAST(GETUTCDATE() AS date)) + 3) % 7), CAST(GETUTCDATE() AS date)); -- 2026-01-01 = jeudi
    INSERT INTO [ReferencePrices] ([Id], [ArticleId], [PrixMin], [PrixMax], [PrixUnitaireTaxe], [DateEffet], [CreatedAt])
    SELECT NEWID(), a.[Id], ROUND(a.[ReferencePrice] * 0.9, 2), ROUND(a.[ReferencePrice] * 1.1, 2), a.[TaxUnitPrice], @effet, SYSDATETIMEOFFSET()
    FROM [Articles] a;

    -- Pont a bascule
    INSERT INTO [Weighbridges] ([Id], [Code], [Name], [CreatedAt])
    VALUES ('30000000-0000-0000-0000-000000000001', N'PB-01', N'Pont à Bascule Nord', SYSDATETIMEOFFSET());

    -- Transporteur + vehicule (Direction 1 = Entrant)
    INSERT INTO [Transporters] ([Id], [Name], [Phone], [Direction], [CreatedAt])
    VALUES ('40000000-0000-0000-0000-000000000001', N'Transports Atlas', N'0600000000', 1, SYSDATETIMEOFFSET());

    INSERT INTO [Vehicles] ([Id], [Matricule], [TransporterId], [DateMiseEnService], [NumeroCarteGrise], [PoidsTare], [PhotoUrl], [CreatedAt])
    VALUES ('41000000-0000-0000-0000-000000000001', N'12345-A-6', '40000000-0000-0000-0000-000000000001', NULL, N'CG-998877', 3000, NULL, SYSDATETIMEOFFSET());

    -- Acheteurs (Type : 1 Grossiste, 3 CantineScolaire, 4 Entreprise)
    INSERT INTO [Buyers] ([Id], [Name], [Type], [CreatedAt])
    VALUES
    ('50000000-0000-0000-0000-000000000001', N'Ets. Bennani',                  1, SYSDATETIMEOFFSET()),
    ('50000000-0000-0000-0000-000000000002', N'Marjane Holding',               4, SYSDATETIMEOFFSET()),
    ('50000000-0000-0000-0000-000000000003', N'Cantine Lycée Al Khawarizmi',   3, SYSDATETIMEOFFSET());

    -- Proprietaires de marchandises
    INSERT INTO [MerchandiseOwners] ([Id], [Name], [Phone], [CreatedAt])
    VALUES
    ('51000000-0000-0000-0000-000000000001', N'Coopérative Souss Primeurs', N'0528000000', SYSDATETIMEOFFSET()),
    ('51000000-0000-0000-0000-000000000002', N'Domaine Alami',              N'0523000000', SYSDATETIMEOFFSET());

    -- Emballages (Type : 1 Carton, 2 Plastique, 3 Bois ; Categorie : 1 Caisse, 2 Palette, 3 Sac)
    INSERT INTO [Packagings] ([Id], [Type], [Categorie], [Poids], [CreatedAt])
    VALUES
    ('52000000-0000-0000-0000-000000000001', 2, 1, 1.8,  SYSDATETIMEOFFSET()),
    ('52000000-0000-0000-0000-000000000002', 3, 2, 22,   SYSDATETIMEOFFSET()),
    ('52000000-0000-0000-0000-000000000003', 1, 1, 0.6,  SYSDATETIMEOFFSET());

    -- Magasins M-01..M-06 (Type 1 = Magasin), 2 emplacements A/B chacun
    -- SpotStatus : 1 Libre, 2 Occupe, 3 Reserve
    INSERT INTO [Premises] ([Id], [Code], [Type], [SpotCount], [CreatedAt]) VALUES
    ('60000000-0000-0000-0000-000000000001', N'M-01', 1, 2, SYSDATETIMEOFFSET()),
    ('60000000-0000-0000-0000-000000000002', N'M-02', 1, 2, SYSDATETIMEOFFSET()),
    ('60000000-0000-0000-0000-000000000003', N'M-03', 1, 2, SYSDATETIMEOFFSET()),
    ('60000000-0000-0000-0000-000000000004', N'M-04', 1, 2, SYSDATETIMEOFFSET()),
    ('60000000-0000-0000-0000-000000000005', N'M-05', 1, 2, SYSDATETIMEOFFSET()),
    ('60000000-0000-0000-0000-000000000006', N'M-06', 1, 2, SYSDATETIMEOFFSET());

    INSERT INTO [ParkingSpots] ([Id], [PremisesId], [Code], [Status], [OccupiedByMatricule], [ReservedBy], [ReservationFee], [CreatedAt]) VALUES
    ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', N'A', 2, N'45821-A-6', NULL, NULL,           SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', N'B', 1, NULL,         NULL, NULL,           SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', N'A', 3, NULL,         N'Ets. Bennani', 500, SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', N'B', 2, N'11902-B-3', NULL, NULL,           SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', N'A', 1, NULL,         NULL, NULL,           SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000003', N'B', 1, NULL,         NULL, NULL,           SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000004', N'A', 2, N'77410-C-1', NULL, NULL,           SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000004', N'B', 3, NULL,         N'Sté. Alami',   250, SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000005', N'A', 1, NULL,         NULL, NULL,           SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-00000000000A', '60000000-0000-0000-0000-000000000005', N'B', 2, N'20933-A-9', NULL, NULL,           SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-00000000000B', '60000000-0000-0000-0000-000000000006', N'A', 1, NULL,         NULL, NULL,           SYSDATETIMEOFFSET()),
    ('61000000-0000-0000-0000-00000000000C', '60000000-0000-0000-0000-000000000006', N'B', 1, NULL,         NULL, NULL,           SYSDATETIMEOFFSET());

    -- Reservations actives (frais = jours inclusifs x 250 MAD/j) ; Status : 1 Active, 2 Terminee
    INSERT INTO [SpotReservations] ([Id], [ParkingSpotId], [Merchant], [Debut], [Fin], [Fee], [Status], [CreatedAt]) VALUES
    ('62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000003', N'Ets. Bennani', CAST(GETUTCDATE() AS date), DATEADD(DAY, 1, CAST(GETUTCDATE() AS date)), 500, 1, SYSDATETIMEOFFSET()),
    ('62000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000008', N'Sté. Alami',   CAST(GETUTCDATE() AS date), CAST(GETUTCDATE() AS date),                  250, 1, SYSDATETIMEOFFSET());

    -- Pre-declarations de demonstration ; Status : 1 EnAttente, 2 Pese, 3 Cloture
    INSERT INTO [PreDeclarations] ([Id], [Matricule], [Transporteur], [Source], [PhotoUrl], [Latitude], [Longitude], [QrCode], [CreatedByUsername], [IsConsumed], [Status], [PesageNetWeight], [PesageTax], [Magasin], [CreatedAt]) VALUES
    ('70000000-0000-0000-0000-000000000001', N'45821-A-6', N'Transport Atlas',      N'Souss-Massa (Agadir)',  NULL, NULL, NULL, N'PRE-2026-0042', N'transporteur', 1, 3, 7850, 196.25, N'M-02', SYSDATETIMEOFFSET()),
    ('70000000-0000-0000-0000-000000000002', N'11902-B-3', N'Sté. Nord Logistique', N'Gharb (Kénitra)',       NULL, NULL, NULL, N'PRE-2026-0043', NULL,            0, 1, NULL, NULL, NULL,     SYSDATETIMEOFFSET()),
    ('70000000-0000-0000-0000-000000000003', N'77410-C-1', N'Transport Chaouia',    N'Doukkala (El Jadida)',  NULL, NULL, NULL, N'PRE-2026-0044', NULL,            0, 1, NULL, NULL, NULL,     SYSDATETIMEOFFSET());

    INSERT INTO [PreDeclarationLines] ([Id], [PreDeclarationId], [ArticleId], [ArticleName], [TonnageApprox], [CreatedAt]) VALUES
    ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', N'Tomate',         8,  SYSDATETIMEOFFSET()),
    ('71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', N'Pomme de terre', 12, SYSDATETIMEOFFSET()),
    ('71000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', N'Oignon',         6,  SYSDATETIMEOFFSET()),
    ('71000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', N'Carotte',        3,  SYSDATETIMEOFFSET());

    -- Infractions de demonstration ; Type : 1 Evasion, 2 ManqueDeclaration, 3 EmballageDifferent
    INSERT INTO [Infractions] ([Id], [ArrivalId], [Reference], [Matricule], [Type], [Amount], [Notes], [CreatedAt]) VALUES
    ('80000000-0000-0000-0000-000000000001', NULL, N'INF-2026-011', N'45821-A-6', 1, 480,  NULL, SYSDATETIMEOFFSET()),
    ('80000000-0000-0000-0000-000000000002', NULL, N'INF-2026-012', N'11902-B-3', 2, 1600, NULL, SYSDATETIMEOFFSET());
END
GO
