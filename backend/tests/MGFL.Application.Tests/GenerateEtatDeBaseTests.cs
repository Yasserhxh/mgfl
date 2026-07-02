using FluentAssertions;
using MGFL.Application.EtatDeBase;
using MGFL.Domain.Enums;
using Xunit;

namespace MGFL.Application.Tests;

public class GenerateEtatDeBaseValidatorTests
{
    private static readonly GenerateEtatDeBaseValidator Validator = new();

    private static EtatDeBaseLineRequest PackedLine(int? crates = 100, decimal refWeight = 30m) => new(
        Guid.NewGuid(), "Pomme de terre", LoadKind.Emballe,
        ReferenceWeightPerCrate: refWeight, ReferencePrice: 4m, TaxUnitPrice: 0.02m,
        CrateCount: crates, DeclaredWeight: 3000m, BulkPercentage: null);

    [Fact]
    public void Rejects_empty_lines()
    {
        var cmd = new GenerateEtatDeBaseCommand(new EtatDeBaseRequest(1000m, null, Array.Empty<EtatDeBaseLineRequest>()));
        Validator.Validate(cmd).IsValid.Should().BeFalse();
    }

    [Fact]
    public void Packed_line_requires_crate_count_and_reference_weight()
    {
        var noCrates = new GenerateEtatDeBaseCommand(new EtatDeBaseRequest(3000m, null, new[] { PackedLine(crates: null) }));
        Validator.Validate(noCrates).IsValid.Should().BeFalse();

        var noRefWeight = new GenerateEtatDeBaseCommand(new EtatDeBaseRequest(3000m, null, new[] { PackedLine(refWeight: 0m) }));
        Validator.Validate(noRefWeight).IsValid.Should().BeFalse();
    }

    [Fact]
    public void Bulk_line_requires_percentage_between_0_and_1()
    {
        var line = new EtatDeBaseLineRequest(
            Guid.NewGuid(), "Oignon", LoadKind.Vrac,
            ReferenceWeightPerCrate: 0m, ReferencePrice: 3m, TaxUnitPrice: 0.015m,
            CrateCount: null, DeclaredWeight: null, BulkPercentage: 1.2m);
        var cmd = new GenerateEtatDeBaseCommand(new EtatDeBaseRequest(9000m, null, new[] { line }));
        Validator.Validate(cmd).IsValid.Should().BeFalse();
    }

    [Fact]
    public void Accepts_a_valid_packed_request()
    {
        var cmd = new GenerateEtatDeBaseCommand(new EtatDeBaseRequest(3000m, null, new[] { PackedLine() }));
        Validator.Validate(cmd).IsValid.Should().BeTrue();
    }
}

public class GenerateEtatDeBaseHandlerTests
{
    private static readonly GenerateEtatDeBaseHandler Handler = new();

    private static Task<EtatDeBaseResponse> SendAsync(EtatDeBaseRequest request)
        => Handler.Handle(new GenerateEtatDeBaseCommand(request), CancellationToken.None);

    [Fact]
    public async Task Cas_A_single_packed_article()
    {
        // 100 caisses × 30 kg = 3 000 kg ; valeur = 3 000 × 4 = 12 000 ; taxe = 12 000 × 0,02 = 240.
        var request = new EtatDeBaseRequest(3000m, null, new[]
        {
            new EtatDeBaseLineRequest(Guid.NewGuid(), "Pomme de terre", LoadKind.Emballe, 30m, 4m, 0.02m, 100, 3000m, null),
        });

        var result = await SendAsync(request);

        result.IsBlocked.Should().BeFalse();
        result.TotalNetWeight.Should().Be(3000m);
        result.TotalMerchandiseValue.Should().Be(12000m);
        result.TotalTax.Should().Be(240m);
    }

    [Fact]
    public async Task Cas_B_multiple_packed_articles_are_ordered_by_ascending_reference_price()
    {
        var request = new EtatDeBaseRequest(5000m, null, new[]
        {
            new EtatDeBaseLineRequest(Guid.NewGuid(), "Fraise", LoadKind.Emballe, 5m, 20m, 0.03m, 200, 1000m, null),
            new EtatDeBaseLineRequest(Guid.NewGuid(), "Oignon", LoadKind.Emballe, 25m, 3m, 0.015m, 160, 4000m, null),
        });

        var result = await SendAsync(request);

        result.IsBlocked.Should().BeFalse();
        result.Lines.Select(l => l.ArticleLabel).Should().ContainInOrder("Oignon", "Fraise");
        result.Lines.Select(l => l.ReferencePrice).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task Cas_C_bulk_articles_are_estimated_by_percentage()
    {
        // 9 000 kg au total : oignon 2/3, carotte 1/3.
        var request = new EtatDeBaseRequest(9000m, null, new[]
        {
            new EtatDeBaseLineRequest(Guid.NewGuid(), "Oignon", LoadKind.Vrac, 0m, 3m, 0.015m, null, null, 2m / 3m),
            new EtatDeBaseLineRequest(Guid.NewGuid(), "Carotte", LoadKind.Vrac, 0m, 3.5m, 0.018m, null, null, 1m / 3m),
        });

        var result = await SendAsync(request);

        result.IsBlocked.Should().BeFalse();
        result.Lines.Single(l => l.ArticleLabel == "Oignon").NetWeight.Should().Be(6000m);
        result.Lines.Single(l => l.ArticleLabel == "Carotte").NetWeight.Should().Be(3000m);
    }

    [Fact]
    public async Task Implausible_packed_line_blocks_the_whole_generation()
    {
        // 3 000 kg / 50 caisses = 60 kg/caisse vs référence 30 kg → écart 100 % > 15 %.
        var request = new EtatDeBaseRequest(3000m, null, new[]
        {
            new EtatDeBaseLineRequest(Guid.NewGuid(), "Pomme de terre", LoadKind.Emballe, 30m, 4m, 0.02m, 50, 3000m, null),
        });

        var result = await SendAsync(request);

        result.IsBlocked.Should().BeTrue();
        result.BlockReasons.Should().ContainSingle(r => r.Contains("Pomme de terre"));
        result.Lines.Should().BeEmpty();
    }
}
