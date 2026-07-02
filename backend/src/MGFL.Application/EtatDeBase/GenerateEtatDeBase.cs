using FluentValidation;
using MediatR;
using MGFL.Domain.Enums;
using MGFL.Domain.Services;

namespace MGFL.Application.EtatDeBase;

/// <summary>Génère (ou bloque) un état de base à partir des lignes pesées.</summary>
public record GenerateEtatDeBaseCommand(EtatDeBaseRequest Request) : IRequest<EtatDeBaseResponse>;

public class GenerateEtatDeBaseValidator : AbstractValidator<GenerateEtatDeBaseCommand>
{
    public GenerateEtatDeBaseValidator()
    {
        RuleFor(x => x.Request.Lines).NotEmpty().WithMessage("Au moins une ligne d'article est requise.");

        RuleForEach(x => x.Request.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ReferencePrice).GreaterThanOrEqualTo(0);
            line.RuleFor(l => l.TaxUnitPrice).GreaterThanOrEqualTo(0);

            line.When(l => l.Kind == LoadKind.Emballe, () =>
            {
                line.RuleFor(l => l.CrateCount).NotNull().GreaterThan(0)
                    .WithMessage("Nombre de caisses requis pour un article emballé.");
                line.RuleFor(l => l.ReferenceWeightPerCrate).GreaterThan(0)
                    .WithMessage("Poids de référence par caisse requis.");
            });

            line.When(l => l.Kind == LoadKind.Vrac, () =>
            {
                line.RuleFor(l => l.BulkPercentage).NotNull()
                    .InclusiveBetween(0m, 1m)
                    .WithMessage("Le pourcentage vrac doit être compris entre 0 et 1.");
            });
        });
    }
}

public class GenerateEtatDeBaseHandler : IRequestHandler<GenerateEtatDeBaseCommand, EtatDeBaseResponse>
{
    public Task<EtatDeBaseResponse> Handle(GenerateEtatDeBaseCommand cmd, CancellationToken ct)
    {
        var req = cmd.Request;

        var input = new EtatDeBaseInput(
            req.TotalDeclaredWeight,
            req.Lines.Select(l => new EtatDeBaseLineInput(
                l.ArticleId, l.ArticleLabel, l.Kind,
                l.ReferenceWeightPerCrate, l.ReferencePrice, l.TaxUnitPrice,
                l.CrateCount, l.DeclaredWeight ?? 0m, l.BulkPercentage)).ToList(),
            req.Tolerance ?? PlausibilityChecker.DefaultTolerance);

        var result = EtatDeBaseCalculator.Generate(input);

        var response = new EtatDeBaseResponse(
            result.IsBlocked,
            result.BlockReasons,
            result.Lines.Select(l => new EtatDeBaseLineResponse(
                l.ArticleId, l.ArticleLabel, l.Kind.ToString(), l.CrateCount,
                l.NetWeight, l.ReferencePrice, l.MerchandiseValue, l.TaxUnitPrice, l.AdValoremTax)).ToList(),
            result.TotalNetWeight, result.TotalMerchandiseValue, result.TotalTax);

        return Task.FromResult(response);
    }
}
