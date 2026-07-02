using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace MGFL.Api.IntegrationTests;

public class ArrivalFlowTests : IClassFixture<MgflApiFactory>
{
    private readonly MgflApiFactory _factory;
    public ArrivalFlowTests(MgflApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Full_flow_weighing_then_departure_frees_the_spots()
    {
        var agent = await _factory.CreateClient().LoginAsync("agent.pab", "Pesage@2026");

        // Pesée du voyage seedé PRE-2026-0043 (Pomme de terre, 12 t déclarées, matricule 11902-B-3).
        // Net = 16 000 − 4 000 − 200 = 11 800 kg ; 400 caisses → 29,5 kg/caisse vs réf. 30 → plausible.
        var weighing = await agent.PostAsJsonAsync("/api/arrivals", new
        {
            code = "PRE-2026-0043",
            grossWeight = 16000m,
            tareWeight = 4000m,
            packagingWeight = 200m,
            magasin = "M-03",
            lines = new[] { new { article = "Pomme de terre", crates = (int?)400 } },
        });

        weighing.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await weighing.Content.ReadFromJsonAsync<JsonElement>();
        result.GetProperty("netWeight").GetDecimal().Should().Be(11800m);
        // Taxe = PoidsNet × PrixUnitaireTaxe = 11 800 × 0,02 = 236 MAD.
        result.GetProperty("totalTax").GetDecimal().Should().Be(236m);

        // Rejouer le même QR doit être refusé.
        var replay = await agent.PostAsJsonAsync("/api/arrivals", new
        {
            code = "PRE-2026-0043",
            grossWeight = 16000m,
            tareWeight = 4000m,
            packagingWeight = 200m,
            magasin = "M-03",
        });
        replay.StatusCode.Should().Be(HttpStatusCode.Conflict);

        // Sortie : clôture du voyage + libération automatique des emplacements du camion.
        var depart = await agent.PostAsync("/api/arrivals/PRE-2026-0043/depart", null);
        depart.StatusCode.Should().Be(HttpStatusCode.OK);
        (await depart.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().Should().Be("Clôturé");

        var spots = await agent.GetFromJsonAsync<JsonElement>("/api/emplacements");
        spots.EnumerateArray().Should().NotContain(s =>
            s.GetProperty("matricule").ValueKind == JsonValueKind.String &&
            s.GetProperty("matricule").GetString() == "11902-B-3");

        // Une seconde sortie est refusée.
        (await agent.PostAsync("/api/arrivals/PRE-2026-0043/depart", null)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Implausible_crate_count_blocks_the_weighing_with_422_and_persists_nothing()
    {
        var agent = await _factory.CreateClient().LoginAsync("agent.pab", "Pesage@2026");

        // PRE-2026-0044 : Oignon 6 t + Carotte 3 t. Net = 9 000 kg → part oignon = 6 000 kg.
        // 100 caisses → 60 kg/caisse vs référence 25 kg → écart largement hors tolérance (±15 %).
        var weighing = await agent.PostAsJsonAsync("/api/arrivals", new
        {
            code = "PRE-2026-0044",
            grossWeight = 12000m,
            tareWeight = 3000m,
            packagingWeight = 0m,
            magasin = "M-06",
            lines = new[] { new { article = "Oignon", crates = (int?)100 } },
        });

        weighing.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var problem = await weighing.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("detail").GetString().Should().Contain("Oignon");

        // Rien n'a été persisté : le voyage reste en attente et peut être repesé.
        var decl = await agent.GetFromJsonAsync<JsonElement>("/api/pre-declarations/PRE-2026-0044");
        decl.GetProperty("status").GetString().Should().Be("En attente");
    }

    [Fact]
    public async Task Weighing_requires_the_weighbridge_agent_role()
    {
        var transporteur = await _factory.CreateClient().LoginAsync("transporteur", "Route@2026");
        var response = await transporteur.PostAsJsonAsync("/api/arrivals", new
        {
            code = "PRE-2026-0043",
            grossWeight = 16000m,
            tareWeight = 4000m,
            packagingWeight = 200m,
            magasin = "M-03",
        });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
