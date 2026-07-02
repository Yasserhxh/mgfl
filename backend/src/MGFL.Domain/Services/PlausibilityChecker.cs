namespace MGFL.Domain.Services;

/// <summary>
/// Contrôle de vraisemblance — vérifie la cohérence du nombre de caisses déclarées
/// face au poids attendu, afin de détecter une erreur de saisie/comptage/chargement.
///
/// Mécanisme : on compare le poids réel par caisse (poids total déclaré / nb caisses)
/// au poids de référence paramétré. Si l'écart relatif dépasse la tolérance, les
/// données sont jugées incohérentes et la génération de l'état de base est BLOQUÉE.
/// </summary>
public static class PlausibilityChecker
{
    /// <summary>Tolérance relative par défaut (±15 %).</summary>
    public const decimal DefaultTolerance = 0.15m;

    public static PlausibilityResult Check(
        string articleLabel,
        decimal referenceWeightPerCrate,
        decimal declaredTotalWeight,
        int crateCount,
        decimal tolerance = DefaultTolerance)
    {
        if (crateCount <= 0)
            return PlausibilityResult.Fail(articleLabel, "Le nombre de caisses doit être supérieur à zéro.");

        if (referenceWeightPerCrate <= 0)
            return PlausibilityResult.Fail(articleLabel, "Poids de référence par caisse non paramétré.");

        var realPerCrate = declaredTotalWeight / crateCount;
        var deviation = Math.Abs(realPerCrate - referenceWeightPerCrate) / referenceWeightPerCrate;

        if (deviation > tolerance)
        {
            var reason =
                $"Incohérence sur « {articleLabel} » : poids réel {realPerCrate:0.##} kg/caisse vs " +
                $"référence {referenceWeightPerCrate:0.##} kg/caisse (écart {deviation:P0} > tolérance {tolerance:P0}).";
            return PlausibilityResult.Fail(articleLabel, reason, realPerCrate, deviation);
        }

        return PlausibilityResult.Ok(articleLabel, realPerCrate, deviation);
    }
}

public sealed record PlausibilityResult(
    bool IsPlausible,
    string ArticleLabel,
    string? Reason,
    decimal RealWeightPerCrate,
    decimal Deviation)
{
    public static PlausibilityResult Ok(string label, decimal real, decimal dev)
        => new(true, label, null, real, dev);

    public static PlausibilityResult Fail(string label, string reason, decimal real = 0, decimal dev = 0)
        => new(false, label, reason, real, dev);
}
