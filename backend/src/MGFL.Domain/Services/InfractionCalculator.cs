using MGFL.Domain.Enums;

namespace MGFL.Domain.Services;

/// <summary>
/// Calcul des pénalités d'infraction. Les trois types appliquent un facteur ×2.
///   Évasion                          = MontantTaxe × 2
///   Manque de déclaration d'article  = (PoidsNonDéclaré × PrixArticle) × 2
///   Emballage différent déclaré      = MontantTaxe × 2
/// </summary>
public static class InfractionCalculator
{
    private const decimal Factor = 2m;

    public static decimal Evasion(decimal taxAmount)
        => TaxCalculator.Round(taxAmount * Factor);

    public static decimal ManqueDeclaration(decimal undeclaredWeight, decimal articlePrice)
        => TaxCalculator.Round(undeclaredWeight * articlePrice * Factor);

    public static decimal EmballageDifferent(decimal taxAmount)
        => TaxCalculator.Round(taxAmount * Factor);

    public static decimal Compute(InfractionType type, decimal a, decimal b = 0m) => type switch
    {
        InfractionType.Evasion => Evasion(a),
        InfractionType.ManqueDeclaration => ManqueDeclaration(a, b),
        InfractionType.EmballageDifferent => EmballageDifferent(a),
        _ => throw new ArgumentOutOfRangeException(nameof(type))
    };
}
