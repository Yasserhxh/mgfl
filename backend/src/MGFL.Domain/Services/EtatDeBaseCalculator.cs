using MGFL.Domain.Enums;

namespace MGFL.Domain.Services;

/// <summary>
/// Génération de l'état de base au pont à bascule. Couvre les trois cas de la spec :
///   A. Un seul article emballé.
///   B. Plusieurs articles emballés — triés par prix de référence croissant.
///   C. Plusieurs articles en vrac — poids estimé au pourcentage du poids total.
///
/// Pour chaque article :
///   PoidsNet (emballé) = NbCaisses × PoidsRéfParCaisse
///   PoidsNet (vrac)    = PoidsTotalDéclaré × Pourcentage
///   Valeur             = PoidsNet × PrixRéférence
///   TaxeAdValorem      = Valeur × PrixTaxeArticle
///
/// Le contrôle de vraisemblance s'applique aux lignes emballées : si une seule ligne
/// échoue, la génération est BLOQUÉE (aucune ligne valide produite).
/// </summary>
public static class EtatDeBaseCalculator
{
    public static EtatDeBaseResult Generate(EtatDeBaseInput input)
    {
        if (input.Lines.Count == 0)
            return EtatDeBaseResult.Blocked(new[] { "Aucune ligne d'article fournie." });

        var blockingReasons = new List<string>();

        // 1) Contrôle de vraisemblance (lignes emballées uniquement).
        foreach (var line in input.Lines.Where(l => l.Kind == LoadKind.Emballe))
        {
            var check = PlausibilityChecker.Check(
                line.ArticleLabel,
                line.ReferenceWeightPerCrate,
                line.DeclaredWeight,
                line.CrateCount ?? 0,
                input.Tolerance);

            if (!check.IsPlausible)
                blockingReasons.Add(check.Reason!);
        }

        if (blockingReasons.Count > 0)
            return EtatDeBaseResult.Blocked(blockingReasons);

        // 2) Tri par prix de référence croissant (cas B) — appliqué uniformément.
        var ordered = input.Lines.OrderBy(l => l.ReferencePrice).ToList();

        // 3) Calcul ligne par ligne.
        var results = new List<EtatDeBaseLineResult>();
        foreach (var line in ordered)
        {
            decimal netWeight = line.Kind == LoadKind.Emballe
                ? (line.CrateCount ?? 0) * line.ReferenceWeightPerCrate
                : input.TotalDeclaredWeight * (line.BulkPercentage ?? 0m);

            var merchandiseValue = TaxCalculator.Round(netWeight * line.ReferencePrice);
            var adValoremTax = TaxCalculator.Round(merchandiseValue * line.TaxUnitPrice);

            results.Add(new EtatDeBaseLineResult(
                line.ArticleId, line.ArticleLabel, line.Kind, line.CrateCount,
                Round3(netWeight), line.ReferencePrice, merchandiseValue,
                line.TaxUnitPrice, adValoremTax));
        }

        return EtatDeBaseResult.Success(results);
    }

    private static decimal Round3(decimal v) => Math.Round(v, 3, MidpointRounding.AwayFromZero);
}

public sealed record EtatDeBaseInput(
    decimal TotalDeclaredWeight,
    IReadOnlyList<EtatDeBaseLineInput> Lines,
    decimal Tolerance = PlausibilityChecker.DefaultTolerance);

public sealed record EtatDeBaseLineInput(
    Guid ArticleId,
    string ArticleLabel,
    LoadKind Kind,
    decimal ReferenceWeightPerCrate,
    decimal ReferencePrice,
    decimal TaxUnitPrice,
    int? CrateCount = null,
    decimal DeclaredWeight = 0m,
    decimal? BulkPercentage = null);

public sealed record EtatDeBaseLineResult(
    Guid ArticleId,
    string ArticleLabel,
    LoadKind Kind,
    int? CrateCount,
    decimal NetWeight,
    decimal ReferencePrice,
    decimal MerchandiseValue,
    decimal TaxUnitPrice,
    decimal AdValoremTax);

public sealed record EtatDeBaseResult
{
    public bool IsBlocked { get; private init; }
    public IReadOnlyList<string> BlockReasons { get; private init; } = Array.Empty<string>();
    public IReadOnlyList<EtatDeBaseLineResult> Lines { get; private init; } = Array.Empty<EtatDeBaseLineResult>();

    public decimal TotalNetWeight => Lines.Sum(l => l.NetWeight);
    public decimal TotalMerchandiseValue => Lines.Sum(l => l.MerchandiseValue);
    public decimal TotalTax => Lines.Sum(l => l.AdValoremTax);

    public static EtatDeBaseResult Success(IReadOnlyList<EtatDeBaseLineResult> lines)
        => new() { IsBlocked = false, Lines = lines };

    public static EtatDeBaseResult Blocked(IReadOnlyList<string> reasons)
        => new() { IsBlocked = true, BlockReasons = reasons };
}
