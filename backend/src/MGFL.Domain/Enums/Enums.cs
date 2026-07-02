namespace MGFL.Domain.Enums;

/// <summary>Sens de circulation du transporteur.</summary>
public enum TransporterDirection
{
    Entrant = 1,
    Sortant = 2
}

/// <summary>Type de local du marché.</summary>
public enum PremisesType
{
    Magasin = 1,
    Pavillon = 2,
    Carre = 3
}

/// <summary>Statut d'un emplacement de stationnement.</summary>
public enum SpotStatus
{
    Libre = 1,
    Occupe = 2,
    Reserve = 3
}

/// <summary>Type d'emballage (matière).</summary>
public enum PackagingType
{
    Carton = 1,
    Plastique = 2,
    Bois = 3
}

/// <summary>Catégorie d'emballage (conditionnement).</summary>
public enum PackagingCategory
{
    Caisse = 1,
    Palette = 2,
    Sac = 3
}

/// <summary>Type d'acheteur opérant au marché.</summary>
public enum BuyerType
{
    Grossiste = 1,
    Mandataire = 2,
    CantineScolaire = 3,
    Entreprise = 4,
    Magasin = 5,
    VendeurDetail = 6
}

/// <summary>Statut d'une pré-déclaration dans le flux d'arrivage.</summary>
public enum PreDeclarationStatus
{
    /// <summary>Déclarée, en attente de passage au pont à bascule.</summary>
    EnAttente = 1,
    /// <summary>Pesée — état de base généré.</summary>
    Pese = 2,
    /// <summary>Clôturée — accusé de réception effectué.</summary>
    Cloture = 3
}

/// <summary>Conditionnement de la marchandise d'une ligne d'arrivage.</summary>
public enum LoadKind
{
    /// <summary>Article emballé (compté en caisses).</summary>
    Emballe = 1,
    /// <summary>Article en vrac (estimé au pourcentage du poids total).</summary>
    Vrac = 2
}

/// <summary>Statut de l'état de base.</summary>
public enum EtatDeBaseStatus
{
    Brouillon = 1,
    Bloque = 2,
    Genere = 3,
    Imprime = 4,
    Receptionne = 5
}

/// <summary>Statut d'une réservation d'emplacement.</summary>
public enum ReservationStatus
{
    Active = 1,
    Terminee = 2
}

/// <summary>Type d'infraction constatée.</summary>
public enum InfractionType
{
    /// <summary>Évasion = Montant de la taxe × 2.</summary>
    Evasion = 1,
    /// <summary>Manque de déclaration d'article = (Poids non déclaré × Prix d'article) × 2.</summary>
    ManqueDeclaration = 2,
    /// <summary>Emballage différent déclaré = Montant de la taxe × 2.</summary>
    EmballageDifferent = 3
}
