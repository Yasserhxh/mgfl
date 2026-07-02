using FluentAssertions;
using MGFL.Domain.Enums;
using MGFL.Domain.Services;
using Xunit;

namespace MGFL.Domain.Tests;

public class TaxCalculatorTests
{
    [Fact]
    public void NetWeight_subtracts_tare_and_packaging()
    {
        // (10000 - 3000) - 200 = 6800
        TaxCalculator.NetWeight(10000m, 3000m, 200m).Should().Be(6800m);
    }

    [Fact]
    public void NetWeight_never_negative()
    {
        TaxCalculator.NetWeight(1000m, 1500m, 100m).Should().Be(0m);
    }

    [Fact]
    public void Tax_is_net_weight_times_unit_price()
    {
        // 6800 * 0.05 = 340
        TaxCalculator.Tax(6800m, 0.05m).Should().Be(340m);
    }
}

public class PlausibilityCheckerTests
{
    [Fact]
    public void Plausible_when_declared_matches_reference()
    {
        // 100 caisses × 30 kg = 3000 kg déclarés → 30 kg/caisse, écart 0.
        var r = PlausibilityChecker.Check("Pomme de terre", 30m, 3000m, 100);
        r.IsPlausible.Should().BeTrue();
        r.RealWeightPerCrate.Should().Be(30m);
    }

    [Fact]
    public void Blocks_when_deviation_exceeds_tolerance()
    {
        // 100 caisses pour 4500 kg → 45 kg/caisse vs 30 → écart 50 % > 15 %.
        var r = PlausibilityChecker.Check("Pomme de terre", 30m, 4500m, 100, tolerance: 0.15m);
        r.IsPlausible.Should().BeFalse();
        r.Reason.Should().Contain("Incohérence");
    }

    [Fact]
    public void Within_tolerance_passes()
    {
        // 100 caisses pour 3300 kg → 33 kg/caisse vs 30 → écart 10 % < 15 %.
        PlausibilityChecker.Check("Tomate", 30m, 3300m, 100, 0.15m).IsPlausible.Should().BeTrue();
    }

    [Fact]
    public void Zero_crates_fails()
        => PlausibilityChecker.Check("X", 30m, 100m, 0).IsPlausible.Should().BeFalse();
}

public class EtatDeBaseCalculatorTests
{
    private static EtatDeBaseLineInput Packaged(string label, int crates, decimal refWeight,
        decimal price, decimal tax, decimal declared)
        => new(Guid.NewGuid(), label, LoadKind.Emballe, refWeight, price, tax,
               CrateCount: crates, DeclaredWeight: declared);

    [Fact]
    public void Case_A_single_packaged_article()
    {
        // 100 caisses × 30 kg = 3000 kg ; valeur = 3000 × 4 = 12000 ; taxe = 12000 × 0.02 = 240.
        var input = new EtatDeBaseInput(3000m, new[] { Packaged("Pomme de terre", 100, 30m, 4m, 0.02m, 3000m) });
        var r = EtatDeBaseCalculator.Generate(input);

        r.IsBlocked.Should().BeFalse();
        r.Lines.Should().HaveCount(1);
        r.Lines[0].NetWeight.Should().Be(3000m);
        r.Lines[0].MerchandiseValue.Should().Be(12000m);
        r.Lines[0].AdValoremTax.Should().Be(240m);
        r.TotalTax.Should().Be(240m);
    }

    [Fact]
    public void Case_B_multiple_packaged_sorted_by_ascending_reference_price()
    {
        var expensive = Packaged("Fraise", 10, 5m, 20m, 0.03m, 50m);   // ref price 20
        var cheap = Packaged("Pomme de terre", 100, 30m, 4m, 0.02m, 3000m); // ref price 4

        var input = new EtatDeBaseInput(3050m, new[] { expensive, cheap });
        var r = EtatDeBaseCalculator.Generate(input);

        r.IsBlocked.Should().BeFalse();
        r.Lines.Select(l => l.ReferencePrice).Should().ContainInOrder(4m, 20m); // tri croissant
    }

    [Fact]
    public void Case_C_bulk_uses_percentage_of_total_weight()
    {
        // Vrac : 60 % de 5000 = 3000 kg ; valeur = 3000 × 2 = 6000 ; taxe = 6000 × 0.01 = 60.
        var bulk = new EtatDeBaseLineInput(Guid.NewGuid(), "Oignon vrac", LoadKind.Vrac,
            ReferenceWeightPerCrate: 0m, ReferencePrice: 2m, TaxUnitPrice: 0.01m, BulkPercentage: 0.60m);

        var r = EtatDeBaseCalculator.Generate(new EtatDeBaseInput(5000m, new[] { bulk }));

        r.IsBlocked.Should().BeFalse();
        r.Lines[0].NetWeight.Should().Be(3000m);
        r.Lines[0].AdValoremTax.Should().Be(60m);
    }

    [Fact]
    public void Blocks_generation_when_any_line_fails_plausibility()
    {
        var good = Packaged("Pomme de terre", 100, 30m, 4m, 0.02m, 3000m);
        var bad = Packaged("Tomate", 100, 20m, 6m, 0.02m, 9000m); // 90 kg/caisse vs 20 → bloque

        var r = EtatDeBaseCalculator.Generate(new EtatDeBaseInput(12000m, new[] { good, bad }));

        r.IsBlocked.Should().BeTrue();
        r.Lines.Should().BeEmpty();
        r.BlockReasons.Should().ContainSingle().Which.Should().Contain("Tomate");
    }
}

public class InfractionCalculatorTests
{
    [Fact]
    public void Evasion_is_tax_times_two()
        => InfractionCalculator.Evasion(340m).Should().Be(680m);

    [Fact]
    public void Manque_declaration_is_weight_times_price_times_two()
        => InfractionCalculator.ManqueDeclaration(500m, 4m).Should().Be(4000m);

    [Fact]
    public void Emballage_different_is_tax_times_two()
        => InfractionCalculator.Compute(InfractionType.EmballageDifferent, 340m).Should().Be(680m);
}
