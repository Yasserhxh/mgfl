using MGFL.Domain.Common;
using MGFL.Domain.Enums;

namespace MGFL.Domain.Entities;

/// <summary>Article négocié au marché (ex. pomme de terre, tomate).</summary>
public class Article : Entity
{
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Famille { get; set; }

    /// <summary>Poids de référence d'une caisse pleine de cet article (kg). Ex. pomme de terre = 30.</summary>
    public decimal ReferenceWeightPerCrate { get; set; }

    /// <summary>Prix de référence courant (MAD/kg) — issu de la dernière mise à jour hebdomadaire.</summary>
    public decimal ReferencePrice { get; set; }

    /// <summary>Prix unitaire de la taxe Ad Valorem (taux), défini par la commission.</summary>
    public decimal TaxUnitPrice { get; set; }
}

/// <summary>Historique versionné des prix de référence (mise à jour chaque jeudi).</summary>
public class ReferencePriceHistory : Entity
{
    public Guid ArticleId { get; set; }
    public Article Article { get; set; } = default!;
    public decimal PrixMin { get; set; }
    public decimal PrixMax { get; set; }
    public decimal PrixUnitaireTaxe { get; set; }
    public DateOnly DateEffet { get; set; }
}

public class Transporter : Entity
{
    public string Name { get; set; } = default!;
    public string? Phone { get; set; }
    public TransporterDirection Direction { get; set; } = TransporterDirection.Entrant;
}

public class Vehicle : Entity
{
    public string Matricule { get; set; } = default!;
    public Guid TransporterId { get; set; }
    public Transporter Transporter { get; set; } = default!;
    public DateOnly? DateMiseEnService { get; set; }
    public string? NumeroCarteGrise { get; set; }
    /// <summary>Poids de la tare à vide du véhicule (kg).</summary>
    public decimal PoidsTare { get; set; }
    public string? PhotoUrl { get; set; }
}

/// <summary>Acheteur opérant au marché (grossiste, mandataire, cantine scolaire…).</summary>
public class Buyer : Entity
{
    public string Name { get; set; } = default!;
    public BuyerType Type { get; set; } = BuyerType.Grossiste;
}

/// <summary>Propriétaire de marchandises.</summary>
public class MerchandiseOwner : Entity
{
    public string Name { get; set; } = default!;
    public string? Phone { get; set; }
}

/// <summary>Type d'emballage référencé (matière × conditionnement × poids unitaire).</summary>
public class Packaging : Entity
{
    /// <summary>Contrainte structurelle : nombre maximal de palettes par camion.</summary>
    public const int MaxPalletsPerTruck = 26;

    public PackagingType Type { get; set; }
    public PackagingCategory Categorie { get; set; }
    /// <summary>Poids unitaire de l'emballage vide (kg).</summary>
    public decimal Poids { get; set; }
}

public class Weighbridge : Entity
{
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
}

public class Premises : Entity
{
    public string Code { get; set; } = default!;
    public PremisesType Type { get; set; }
    /// <summary>Nombre d'emplacements (2 par magasin par défaut).</summary>
    public int SpotCount { get; set; } = 2;
    public ICollection<ParkingSpot> Spots { get; set; } = new List<ParkingSpot>();
}

public class ParkingSpot : Entity
{
    public Guid PremisesId { get; set; }
    public Premises Premises { get; set; } = default!;
    public string Code { get; set; } = default!;
    public SpotStatus Status { get; set; } = SpotStatus.Libre;

    /// <summary>Matricule du camion occupant l'emplacement (si Occupé).</summary>
    public string? OccupiedByMatricule { get; set; }
    /// <summary>Commerçant ayant réservé l'emplacement (si Réservé).</summary>
    public string? ReservedBy { get; set; }
    /// <summary>Frais de réservation à la charge du commerçant (MAD).</summary>
    public decimal? ReservationFee { get; set; }
}

/// <summary>
/// Réservation d'un emplacement par un commerçant pour une durée déterminée,
/// générant des frais à sa charge (CLAUDE.md §6.4).
/// </summary>
public class SpotReservation : Entity
{
    public Guid ParkingSpotId { get; set; }
    public ParkingSpot ParkingSpot { get; set; } = default!;

    /// <summary>Commerçant à la charge duquel sont les frais.</summary>
    public string Merchant { get; set; } = default!;
    public DateOnly Debut { get; set; }
    public DateOnly Fin { get; set; }

    /// <summary>Frais facturés (MAD) — figés à la création.</summary>
    public decimal Fee { get; set; }
    public ReservationStatus Status { get; set; } = ReservationStatus.Active;

    /// <summary>Nombre de jours facturés (bornes incluses, minimum 1).</summary>
    public static int BilledDays(DateOnly debut, DateOnly fin)
        => Math.Max(1, fin.DayNumber - debut.DayNumber + 1);

    public static decimal ComputeFee(DateOnly debut, DateOnly fin, decimal dailyRate)
        => BilledDays(debut, fin) * dailyRate;
}
