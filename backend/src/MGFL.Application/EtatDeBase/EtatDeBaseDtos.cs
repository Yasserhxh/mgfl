using MGFL.Domain.Enums;

namespace MGFL.Application.EtatDeBase;

public record EtatDeBaseLineRequest(
    Guid ArticleId,
    string ArticleLabel,
    LoadKind Kind,
    decimal ReferenceWeightPerCrate,
    decimal ReferencePrice,
    decimal TaxUnitPrice,
    int? CrateCount,
    decimal? DeclaredWeight,
    decimal? BulkPercentage);

public record EtatDeBaseRequest(
    decimal TotalDeclaredWeight,
    decimal? Tolerance,
    IReadOnlyList<EtatDeBaseLineRequest> Lines);

public record EtatDeBaseLineResponse(
    Guid ArticleId,
    string ArticleLabel,
    string Kind,
    int? CrateCount,
    decimal NetWeight,
    decimal ReferencePrice,
    decimal MerchandiseValue,
    decimal TaxUnitPrice,
    decimal AdValoremTax);

public record EtatDeBaseResponse(
    bool IsBlocked,
    IReadOnlyList<string> BlockReasons,
    IReadOnlyList<EtatDeBaseLineResponse> Lines,
    decimal TotalNetWeight,
    decimal TotalMerchandiseValue,
    decimal TotalTax);
