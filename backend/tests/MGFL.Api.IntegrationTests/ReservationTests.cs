using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace MGFL.Api.IntegrationTests;

public class ReservationTests : IClassFixture<MgflApiFactory>
{
    private readonly MgflApiFactory _factory;
    public ReservationTests(MgflApiFactory factory) => _factory = factory;

    private static async Task<(Guid id, string store)> FirstFreeSpotAsync(HttpClient client)
    {
        var spots = await client.GetFromJsonAsync<JsonElement>("/api/emplacements");
        var free = spots.EnumerateArray().First(s => s.GetProperty("status").GetString() == "Libre");
        return (Guid.Parse(free.GetProperty("id").GetString()!), free.GetProperty("store").GetString()!);
    }

    [Fact]
    public async Task Reservation_lifecycle_reserves_then_frees_the_spot_with_correct_fee()
    {
        var agent = await _factory.CreateClient().LoginAsync("agent.orga", "Parking@2026");
        var (spotId, _) = await FirstFreeSpotAsync(agent);

        // 3 jours inclusifs × 250 MAD = 750 MAD.
        var create = await agent.PostAsJsonAsync("/api/reservations",
            new { spotId, merchant = "Ets. Test", debut = "2026-07-06", fin = "2026-07-08" });
        create.StatusCode.Should().Be(HttpStatusCode.OK);
        var reservation = await create.Content.ReadFromJsonAsync<JsonElement>();
        reservation.GetProperty("days").GetInt32().Should().Be(3);
        reservation.GetProperty("fee").GetDecimal().Should().Be(750m);
        reservation.GetProperty("status").GetString().Should().Be("Active");

        // L'emplacement est passé à "Réservé" et ne peut plus être réservé.
        var spots = await agent.GetFromJsonAsync<JsonElement>("/api/emplacements");
        spots.EnumerateArray().First(s => s.GetProperty("id").GetString() == spotId.ToString())
            .GetProperty("status").GetString().Should().Be("Réservé");

        var conflict = await agent.PostAsJsonAsync("/api/reservations",
            new { spotId, merchant = "Autre", debut = "2026-07-06", fin = "2026-07-06" });
        conflict.StatusCode.Should().Be(HttpStatusCode.Conflict);

        // Fin de réservation → emplacement libéré.
        var id = reservation.GetProperty("id").GetGuid();
        var end = await agent.PostAsync($"/api/reservations/{id}/end", null);
        end.StatusCode.Should().Be(HttpStatusCode.OK);
        (await end.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().Should().Be("Terminée");

        spots = await agent.GetFromJsonAsync<JsonElement>("/api/emplacements");
        spots.EnumerateArray().First(s => s.GetProperty("id").GetString() == spotId.ToString())
            .GetProperty("status").GetString().Should().Be("Libre");
    }

    [Fact]
    public async Task Invalid_dates_are_rejected()
    {
        var merchant = await _factory.CreateClient().LoginAsync("commercant", "Marche@2026");
        var (spotId, _) = await FirstFreeSpotAsync(merchant);

        var response = await merchant.PostAsJsonAsync("/api/reservations",
            new { spotId, merchant = "Ets. Bennani", debut = "2026-07-10", fin = "2026-07-08" });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Reservation_management_is_denied_to_other_roles()
    {
        var transporteur = await _factory.CreateClient().LoginAsync("transporteur", "Route@2026");
        var (spotId, _) = await FirstFreeSpotAsync(transporteur);

        var response = await transporteur.PostAsJsonAsync("/api/reservations",
            new { spotId, merchant = "X", debut = "2026-07-06", fin = "2026-07-06" });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
