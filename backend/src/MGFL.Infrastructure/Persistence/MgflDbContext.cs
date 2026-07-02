using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;

namespace MGFL.Infrastructure.Persistence;

public class MgflDbContext : DbContext
{
    public MgflDbContext(DbContextOptions<MgflDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ReferencePriceHistory> ReferencePrices => Set<ReferencePriceHistory>();
    public DbSet<Transporter> Transporters => Set<Transporter>();
    public DbSet<Buyer> Buyers => Set<Buyer>();
    public DbSet<MerchandiseOwner> MerchandiseOwners => Set<MerchandiseOwner>();
    public DbSet<Packaging> Packagings => Set<Packaging>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Weighbridge> Weighbridges => Set<Weighbridge>();
    public DbSet<Premises> Premises => Set<Premises>();
    public DbSet<ParkingSpot> ParkingSpots => Set<ParkingSpot>();
    public DbSet<SpotReservation> SpotReservations => Set<SpotReservation>();
    public DbSet<PreDeclaration> PreDeclarations => Set<PreDeclaration>();
    public DbSet<PreDeclarationLine> PreDeclarationLines => Set<PreDeclarationLine>();
    public DbSet<Arrival> Arrivals => Set<Arrival>();
    public DbSet<EtatDeBase> EtatsDeBase => Set<EtatDeBase>();
    public DbSet<EtatDeBaseLine> EtatDeBaseLines => Set<EtatDeBaseLine>();
    public DbSet<Infraction> Infractions => Set<Infraction>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<AppUser>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.Property(x => x.Username).HasMaxLength(80).IsRequired();
            e.Property(x => x.FullName).HasMaxLength(160).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(400).IsRequired();
            e.Property(x => x.Role).HasMaxLength(40).IsRequired();
        });

        b.Entity<Article>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Code).HasMaxLength(40).IsRequired();
            e.Property(x => x.Name).HasMaxLength(160).IsRequired();
        });

        b.Entity<Vehicle>(e =>
        {
            e.HasIndex(x => x.Matricule);
            e.Property(x => x.Matricule).HasMaxLength(40).IsRequired();
            e.HasOne(x => x.Transporter).WithMany().HasForeignKey(x => x.TransporterId);
        });

        b.Entity<Buyer>().Property(x => x.Name).HasMaxLength(160).IsRequired();
        b.Entity<MerchandiseOwner>().Property(x => x.Name).HasMaxLength(160).IsRequired();

        b.Entity<Premises>().HasMany(x => x.Spots).WithOne(x => x.Premises).HasForeignKey(x => x.PremisesId);

        b.Entity<SpotReservation>(e =>
        {
            e.Property(x => x.Merchant).HasMaxLength(160).IsRequired();
            e.HasOne(x => x.ParkingSpot).WithMany().HasForeignKey(x => x.ParkingSpotId);
        });

        b.Entity<PreDeclaration>(e =>
        {
            e.HasIndex(x => x.QrCode).IsUnique();
            e.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.PreDeclarationId);
        });

        b.Entity<Arrival>(e =>
        {
            e.HasOne(x => x.Weighbridge).WithMany().HasForeignKey(x => x.WeighbridgeId);
            e.HasOne(x => x.EtatDeBase).WithOne(x => x.Arrival).HasForeignKey<EtatDeBase>(x => x.ArrivalId);
            e.HasMany(x => x.Infractions).WithOne().HasForeignKey(x => x.ArrivalId);
        });

        b.Entity<EtatDeBase>(e =>
        {
            e.HasIndex(x => x.Number).IsUnique();
            e.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.EtatDeBaseId);
        });

        // Précision monétaire : poids en (18,3), montants/prix en (18,2).
        foreach (var prop in b.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            var name = prop.Name.ToLowerInvariant();
            prop.SetPrecision(18);
            prop.SetScale(name.Contains("weight") || name.Contains("poids") || name.Contains("tonnage") ? 3 : 2);
        }
    }
}
