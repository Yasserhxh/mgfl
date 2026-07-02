using MGFL.Domain.Common;
using MGFL.Domain.Enums;

namespace MGFL.Domain.Entities;

/// <summary>Pré-déclaration mobile saisie par le transporteur avant arrivée.</summary>
public class PreDeclaration : Entity
{
    public string Matricule { get; set; } = default!;
    public string? Transporteur { get; set; }
    public string? Source { get; set; }
    public string? PhotoUrl { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string QrCode { get; set; } = default!;
    /// <summary>Compte transporteur ayant créé la déclaration — utilisé pour restreindre la liste à ses voyages.</summary>
    public string? CreatedByUsername { get; set; }
    public bool IsConsumed { get; set; }
    public PreDeclarationStatus Status { get; set; } = PreDeclarationStatus.EnAttente;

    // Résumé de pesage renseigné à l'arrivage (dénormalisé pour l'affichage).
    public decimal? PesageNetWeight { get; set; }
    public decimal? PesageTax { get; set; }
    public string? Magasin { get; set; }

    public ICollection<PreDeclarationLine> Lines { get; set; } = new List<PreDeclarationLine>();
}

public class PreDeclarationLine : Entity
{
    public Guid PreDeclarationId { get; set; }
    public Guid? ArticleId { get; set; }
    public Article? Article { get; set; }
    /// <summary>Libellé de l'article (dénormalisé — saisi côté mobile).</summary>
    public string ArticleName { get; set; } = default!;
    /// <summary>Tonnage approximatif déclaré par le transporteur (tonnes).</summary>
    public decimal TonnageApprox { get; set; }
}

/// <summary>Arrivage pesé au pont à bascule.</summary>
public class Arrival : Entity
{
    public Guid? PreDeclarationId { get; set; }
    public Guid WeighbridgeId { get; set; }
    public Weighbridge Weighbridge { get; set; } = default!;
    public string Matricule { get; set; } = default!;

    public decimal GrossWeight { get; set; }        // Poids brut (kg)
    public decimal EmptyTareWeight { get; set; }    // Poids tare à vide (kg)
    public decimal PackagingWeight { get; set; }    // Poids d'emballage (kg)

    public Guid? ReceivingPremisesId { get; set; }
    public Premises? ReceivingPremises { get; set; }

    public EtatDeBase? EtatDeBase { get; set; }
    public ICollection<Infraction> Infractions { get; set; } = new List<Infraction>();
}

/// <summary>État de base généré au pont à bascule (document fiscal/logistique).</summary>
public class EtatDeBase : Entity
{
    public Guid ArrivalId { get; set; }
    public Arrival Arrival { get; set; } = default!;
    public string Number { get; set; } = default!;
    public EtatDeBaseStatus Status { get; set; } = EtatDeBaseStatus.Brouillon;

    /// <summary>Renseigné quand le contrôle de vraisemblance échoue (génération bloquée).</summary>
    public string? BlockReason { get; set; }

    public decimal TotalNetWeight { get; set; }
    public decimal TotalMerchandiseValue { get; set; }
    public decimal TotalTax { get; set; }

    public DateTimeOffset? PrintedAt { get; set; }
    public DateTimeOffset? ReceivedAt { get; set; }

    public ICollection<EtatDeBaseLine> Lines { get; set; } = new List<EtatDeBaseLine>();
}

public class EtatDeBaseLine : Entity
{
    public Guid EtatDeBaseId { get; set; }
    public Guid ArticleId { get; set; }
    public Article Article { get; set; } = default!;

    public int? NbCrates { get; set; }
    public decimal NetWeight { get; set; }
    public decimal ReferencePrice { get; set; }
    public decimal MerchandiseValue { get; set; }
    public decimal TaxUnitPrice { get; set; }
    public decimal AdValoremTax { get; set; }
}

public class Infraction : Entity
{
    public Guid? ArrivalId { get; set; }
    public string? Reference { get; set; }
    public string? Matricule { get; set; }
    public InfractionType Type { get; set; }
    public decimal Amount { get; set; }
    public string? Notes { get; set; }
}
