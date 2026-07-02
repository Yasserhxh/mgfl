IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Articles] (
        [Id] uniqueidentifier NOT NULL,
        [Code] nvarchar(40) NOT NULL,
        [Name] nvarchar(160) NOT NULL,
        [Famille] nvarchar(max) NULL,
        [ReferenceWeightPerCrate] decimal(18,3) NOT NULL,
        [ReferencePrice] decimal(18,2) NOT NULL,
        [TaxUnitPrice] decimal(18,2) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Articles] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Buyers] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(160) NOT NULL,
        [Type] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Buyers] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [MerchandiseOwners] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(160) NOT NULL,
        [Phone] nvarchar(max) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_MerchandiseOwners] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Packagings] (
        [Id] uniqueidentifier NOT NULL,
        [Type] int NOT NULL,
        [Categorie] int NOT NULL,
        [Poids] decimal(18,3) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Packagings] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [PreDeclarations] (
        [Id] uniqueidentifier NOT NULL,
        [Matricule] nvarchar(max) NOT NULL,
        [Transporteur] nvarchar(max) NULL,
        [Source] nvarchar(max) NULL,
        [PhotoUrl] nvarchar(max) NULL,
        [Latitude] float NULL,
        [Longitude] float NULL,
        [QrCode] nvarchar(450) NOT NULL,
        [IsConsumed] bit NOT NULL,
        [Status] int NOT NULL,
        [PesageNetWeight] decimal(18,3) NULL,
        [PesageTax] decimal(18,2) NULL,
        [Magasin] nvarchar(max) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_PreDeclarations] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Premises] (
        [Id] uniqueidentifier NOT NULL,
        [Code] nvarchar(max) NOT NULL,
        [Type] int NOT NULL,
        [SpotCount] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Premises] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Transporters] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [Phone] nvarchar(max) NULL,
        [Direction] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Transporters] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] uniqueidentifier NOT NULL,
        [Username] nvarchar(80) NOT NULL,
        [FullName] nvarchar(160) NOT NULL,
        [PasswordHash] nvarchar(400) NOT NULL,
        [Role] nvarchar(40) NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Weighbridges] (
        [Id] uniqueidentifier NOT NULL,
        [Code] nvarchar(max) NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Weighbridges] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [ReferencePrices] (
        [Id] uniqueidentifier NOT NULL,
        [ArticleId] uniqueidentifier NOT NULL,
        [PrixMin] decimal(18,2) NOT NULL,
        [PrixMax] decimal(18,2) NOT NULL,
        [PrixUnitaireTaxe] decimal(18,2) NOT NULL,
        [DateEffet] date NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_ReferencePrices] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReferencePrices_Articles_ArticleId] FOREIGN KEY ([ArticleId]) REFERENCES [Articles] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [PreDeclarationLines] (
        [Id] uniqueidentifier NOT NULL,
        [PreDeclarationId] uniqueidentifier NOT NULL,
        [ArticleId] uniqueidentifier NULL,
        [ArticleName] nvarchar(max) NOT NULL,
        [TonnageApprox] decimal(18,3) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_PreDeclarationLines] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PreDeclarationLines_Articles_ArticleId] FOREIGN KEY ([ArticleId]) REFERENCES [Articles] ([Id]),
        CONSTRAINT [FK_PreDeclarationLines_PreDeclarations_PreDeclarationId] FOREIGN KEY ([PreDeclarationId]) REFERENCES [PreDeclarations] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [ParkingSpots] (
        [Id] uniqueidentifier NOT NULL,
        [PremisesId] uniqueidentifier NOT NULL,
        [Code] nvarchar(max) NOT NULL,
        [Status] int NOT NULL,
        [OccupiedByMatricule] nvarchar(max) NULL,
        [ReservedBy] nvarchar(max) NULL,
        [ReservationFee] decimal(18,2) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_ParkingSpots] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ParkingSpots_Premises_PremisesId] FOREIGN KEY ([PremisesId]) REFERENCES [Premises] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Vehicles] (
        [Id] uniqueidentifier NOT NULL,
        [Matricule] nvarchar(40) NOT NULL,
        [TransporterId] uniqueidentifier NOT NULL,
        [DateMiseEnService] date NULL,
        [NumeroCarteGrise] nvarchar(max) NULL,
        [PoidsTare] decimal(18,3) NOT NULL,
        [PhotoUrl] nvarchar(max) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Vehicles] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Vehicles_Transporters_TransporterId] FOREIGN KEY ([TransporterId]) REFERENCES [Transporters] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Arrivals] (
        [Id] uniqueidentifier NOT NULL,
        [PreDeclarationId] uniqueidentifier NULL,
        [WeighbridgeId] uniqueidentifier NOT NULL,
        [Matricule] nvarchar(max) NOT NULL,
        [GrossWeight] decimal(18,3) NOT NULL,
        [EmptyTareWeight] decimal(18,3) NOT NULL,
        [PackagingWeight] decimal(18,3) NOT NULL,
        [ReceivingPremisesId] uniqueidentifier NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Arrivals] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Arrivals_Premises_ReceivingPremisesId] FOREIGN KEY ([ReceivingPremisesId]) REFERENCES [Premises] ([Id]),
        CONSTRAINT [FK_Arrivals_Weighbridges_WeighbridgeId] FOREIGN KEY ([WeighbridgeId]) REFERENCES [Weighbridges] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [EtatsDeBase] (
        [Id] uniqueidentifier NOT NULL,
        [ArrivalId] uniqueidentifier NOT NULL,
        [Number] nvarchar(450) NOT NULL,
        [Status] int NOT NULL,
        [BlockReason] nvarchar(max) NULL,
        [TotalNetWeight] decimal(18,3) NOT NULL,
        [TotalMerchandiseValue] decimal(18,2) NOT NULL,
        [TotalTax] decimal(18,2) NOT NULL,
        [PrintedAt] datetimeoffset NULL,
        [ReceivedAt] datetimeoffset NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_EtatsDeBase] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EtatsDeBase_Arrivals_ArrivalId] FOREIGN KEY ([ArrivalId]) REFERENCES [Arrivals] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [Infractions] (
        [Id] uniqueidentifier NOT NULL,
        [ArrivalId] uniqueidentifier NULL,
        [Reference] nvarchar(max) NULL,
        [Matricule] nvarchar(max) NULL,
        [Type] int NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_Infractions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Infractions_Arrivals_ArrivalId] FOREIGN KEY ([ArrivalId]) REFERENCES [Arrivals] ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE TABLE [EtatDeBaseLines] (
        [Id] uniqueidentifier NOT NULL,
        [EtatDeBaseId] uniqueidentifier NOT NULL,
        [ArticleId] uniqueidentifier NOT NULL,
        [NbCrates] int NULL,
        [NetWeight] decimal(18,3) NOT NULL,
        [ReferencePrice] decimal(18,2) NOT NULL,
        [MerchandiseValue] decimal(18,2) NOT NULL,
        [TaxUnitPrice] decimal(18,2) NOT NULL,
        [AdValoremTax] decimal(18,2) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_EtatDeBaseLines] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EtatDeBaseLines_Articles_ArticleId] FOREIGN KEY ([ArticleId]) REFERENCES [Articles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_EtatDeBaseLines_EtatsDeBase_EtatDeBaseId] FOREIGN KEY ([EtatDeBaseId]) REFERENCES [EtatsDeBase] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Arrivals_ReceivingPremisesId] ON [Arrivals] ([ReceivingPremisesId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Arrivals_WeighbridgeId] ON [Arrivals] ([WeighbridgeId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Articles_Code] ON [Articles] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_EtatDeBaseLines_ArticleId] ON [EtatDeBaseLines] ([ArticleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_EtatDeBaseLines_EtatDeBaseId] ON [EtatDeBaseLines] ([EtatDeBaseId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_EtatsDeBase_ArrivalId] ON [EtatsDeBase] ([ArrivalId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_EtatsDeBase_Number] ON [EtatsDeBase] ([Number]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Infractions_ArrivalId] ON [Infractions] ([ArrivalId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ParkingSpots_PremisesId] ON [ParkingSpots] ([PremisesId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_PreDeclarationLines_ArticleId] ON [PreDeclarationLines] ([ArticleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_PreDeclarationLines_PreDeclarationId] ON [PreDeclarationLines] ([PreDeclarationId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PreDeclarations_QrCode] ON [PreDeclarations] ([QrCode]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ReferencePrices_ArticleId] ON [ReferencePrices] ([ArticleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Username] ON [Users] ([Username]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Vehicles_Matricule] ON [Vehicles] ([Matricule]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Vehicles_TransporterId] ON [Vehicles] ([TransporterId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702105121_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260702105121_InitialCreate', N'8.0.10');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702115452_ReservationsAndVoyageOwner'
)
BEGIN
    ALTER TABLE [PreDeclarations] ADD [CreatedByUsername] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702115452_ReservationsAndVoyageOwner'
)
BEGIN
    CREATE TABLE [SpotReservations] (
        [Id] uniqueidentifier NOT NULL,
        [ParkingSpotId] uniqueidentifier NOT NULL,
        [Merchant] nvarchar(160) NOT NULL,
        [Debut] date NOT NULL,
        [Fin] date NOT NULL,
        [Fee] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NULL,
        CONSTRAINT [PK_SpotReservations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SpotReservations_ParkingSpots_ParkingSpotId] FOREIGN KEY ([ParkingSpotId]) REFERENCES [ParkingSpots] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702115452_ReservationsAndVoyageOwner'
)
BEGIN
    CREATE INDEX [IX_SpotReservations_ParkingSpotId] ON [SpotReservations] ([ParkingSpotId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260702115452_ReservationsAndVoyageOwner'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260702115452_ReservationsAndVoyageOwner', N'8.0.10');
END;
GO

COMMIT;
GO

