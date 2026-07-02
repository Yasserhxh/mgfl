using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace MGFL.Api.IntegrationTests;

public class AuthAndReferentielsTests : IClassFixture<MgflApiFactory>
{
    private readonly MgflApiFactory _factory;
    public AuthAndReferentielsTests(MgflApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Login_returns_token_and_user_profile()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "Admin@2026" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        payload.GetProperty("token").GetString().Should().NotBeNullOrWhiteSpace();
        payload.GetProperty("user").GetProperty("role").GetString().Should().Be("Admin");
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "wrong" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Endpoints_deny_anonymous_access_by_default()
    {
        var client = _factory.CreateClient();
        (await client.GetAsync("/api/articles")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.GetAsync("/api/emplacements")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Referential_writes_require_the_admin_role()
    {
        var agent = await _factory.CreateClient().LoginAsync("agent.pab", "Pesage@2026");
        var body = new { code = "MEL", name = "Melon", famille = "Fruits", referenceWeightPerCrate = 15m, referencePrice = 8m, taxUnitPrice = 0.02m };

        var forbidden = await agent.PostAsJsonAsync("/api/articles", body);
        forbidden.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Admin_can_manage_the_referentials()
    {
        var admin = await _factory.CreateClient().LoginAsync("admin", "Admin@2026");

        // Article : création puis rejet du code en double.
        var article = new { code = "MEL", name = "Melon", famille = "Fruits", referenceWeightPerCrate = 15m, referencePrice = 8m, taxUnitPrice = 0.02m };
        (await admin.PostAsJsonAsync("/api/articles", article)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.PostAsJsonAsync("/api/articles", article)).StatusCode.Should().Be(HttpStatusCode.Conflict);

        // Transporteur + véhicule rattaché.
        var t = await (await admin.PostAsJsonAsync("/api/transporters",
            new { name = "Transports Test", phone = "0611111111", direction = "Entrant" })).Content.ReadFromJsonAsync<JsonElement>();
        var transporterId = t.GetProperty("id").GetGuid();

        var vehicle = await admin.PostAsJsonAsync("/api/vehicles",
            new { matricule = "99999-Z-9", transporterId, numeroCarteGrise = "CG-TEST", poidsTare = 3500m });
        vehicle.StatusCode.Should().Be(HttpStatusCode.OK);

        // Suppression bloquée tant qu'un véhicule est rattaché.
        (await admin.DeleteAsync($"/api/transporters/{transporterId}")).StatusCode.Should().Be(HttpStatusCode.Conflict);

        // Acheteurs / emballages / propriétaires : lecture + création.
        (await admin.PostAsJsonAsync("/api/buyers", new { name = "Test Grossiste", type = "Grossiste" })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.PostAsJsonAsync("/api/packagings", new { type = "Plastique", categorie = "Caisse", poids = 1.5m })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.PostAsJsonAsync("/api/merchandise-owners", new { name = "Test Owner", phone = "0622222222" })).StatusCode.Should().Be(HttpStatusCode.OK);

        var buyers = await admin.GetFromJsonAsync<JsonElement>("/api/buyers");
        buyers.EnumerateArray().Should().Contain(b => b.GetProperty("name").GetString() == "Test Grossiste");
    }
}
