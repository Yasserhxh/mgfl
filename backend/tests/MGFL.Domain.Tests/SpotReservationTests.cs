using FluentAssertions;
using MGFL.Domain.Entities;
using Xunit;

namespace MGFL.Domain.Tests;

public class SpotReservationTests
{
    [Theory]
    [InlineData("2026-07-06", "2026-07-06", 1)]  // même jour = 1 jour facturé
    [InlineData("2026-07-06", "2026-07-08", 3)]  // bornes incluses
    [InlineData("2026-07-01", "2026-07-31", 31)]
    public void BilledDays_counts_inclusive_days(string debut, string fin, int expected)
        => SpotReservation.BilledDays(DateOnly.Parse(debut), DateOnly.Parse(fin)).Should().Be(expected);

    [Fact]
    public void BilledDays_never_drops_below_one()
        => SpotReservation.BilledDays(DateOnly.Parse("2026-07-10"), DateOnly.Parse("2026-07-08")).Should().Be(1);

    [Fact]
    public void Fee_is_days_times_daily_rate()
        => SpotReservation.ComputeFee(DateOnly.Parse("2026-07-06"), DateOnly.Parse("2026-07-08"), 250m).Should().Be(750m);
}
