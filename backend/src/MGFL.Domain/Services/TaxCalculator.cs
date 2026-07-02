namespace MGFL.Domain.Services;

/// <summary>
/// Calcul de la taxe au pont à bascule (cas pesée simple).
/// PoidsNet = (PoidsBrut − PoidsTareVide) − PoidsEmballage
/// Taxe     = PoidsNet × PrixUnitaireTaxe
/// </summary>
public static class TaxCalculator
{
    public static decimal NetWeight(decimal grossWeight, decimal emptyTareWeight, decimal packagingWeight)
    {
        var net = (grossWeight - emptyTareWeight) - packagingWeight;
        return net < 0 ? 0 : net;
    }

    public static decimal Tax(decimal netWeight, decimal taxUnitPrice)
        => Round(netWeight * taxUnitPrice);

    /// <summary>Arrondi monétaire (2 décimales, MidpointRounding.AwayFromZero).</summary>
    public static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    /// <summary>Arrondi des poids (3 décimales, MidpointRounding.AwayFromZero).</summary>
    public static decimal Round3(decimal value) => Math.Round(value, 3, MidpointRounding.AwayFromZero);
}
