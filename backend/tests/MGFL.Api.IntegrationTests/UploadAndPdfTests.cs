using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MGFL.Api.IntegrationTests;

public class UploadAndPdfTests : IClassFixture<MgflApiFactory>
{
    private readonly MgflApiFactory _factory;
    public UploadAndPdfTests(MgflApiFactory factory) => _factory = factory;

    private static MultipartFormDataContent PhotoContent(string contentType, string fileName)
    {
        var bytes = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-image-bytes"));
        bytes.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent { { bytes, "file", fileName } };
    }

    [Fact]
    public async Task Photo_upload_returns_a_served_url_and_never_reuses_the_client_file_name()
    {
        var transporteur = await _factory.CreateClient().LoginAsync("transporteur", "Route@2026");

        var response = await transporteur.PostAsync("/api/uploads/photos", PhotoContent("image/jpeg", "../evil.jpg"));
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var url = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("url").GetString()!;
        url.Should().StartWith("/uploads/photos/").And.EndWith(".jpg").And.NotContain("evil");

        // Le fichier est réellement servi en statique.
        (await transporteur.GetAsync(url)).StatusCode.Should().Be(HttpStatusCode.OK);

        // Nettoyage : ne pas laisser de fichier de test dans wwwroot.
        var env = _factory.Services.GetRequiredService<IWebHostEnvironment>();
        var path = Path.Combine(env.ContentRootPath, "wwwroot",
            url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(path)) File.Delete(path);
    }

    [Fact]
    public async Task Unsupported_content_type_is_rejected()
    {
        var transporteur = await _factory.CreateClient().LoginAsync("transporteur", "Route@2026");
        var response = await transporteur.PostAsync("/api/uploads/photos", PhotoContent("application/pdf", "doc.pdf"));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Weighing_produces_an_etat_number_and_a_downloadable_pdf()
    {
        var agent = await _factory.CreateClient().LoginAsync("agent.pab", "Pesage@2026");

        var weighing = await agent.PostAsJsonAsync("/api/arrivals", new
        {
            code = "PRE-2026-0043",
            grossWeight = 16000m,
            tareWeight = 4000m,
            packagingWeight = 200m,
            magasin = "M-03",
        });
        weighing.StatusCode.Should().Be(HttpStatusCode.OK);
        var etatNumber = (await weighing.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("etatNumber").GetString()!;
        etatNumber.Should().StartWith("EB-");

        // Le document apparaît dans la liste.
        var list = await agent.GetFromJsonAsync<JsonElement>("/api/etats-de-base");
        list.EnumerateArray().Should().Contain(e => e.GetProperty("number").GetString() == etatNumber);

        // Téléchargement PDF : contenu valide + statut passé à "Imprimé".
        var pdf = await agent.GetAsync($"/api/etats-de-base/{etatNumber}/pdf");
        pdf.StatusCode.Should().Be(HttpStatusCode.OK);
        pdf.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        var bytes = await pdf.Content.ReadAsByteArrayAsync();
        Encoding.ASCII.GetString(bytes, 0, 4).Should().Be("%PDF");

        list = await agent.GetFromJsonAsync<JsonElement>("/api/etats-de-base");
        list.EnumerateArray().First(e => e.GetProperty("number").GetString() == etatNumber)
            .GetProperty("status").GetString().Should().Be("Imprimé");
    }
}

public class VoyageScopingTests : IClassFixture<MgflApiFactory>
{
    private readonly MgflApiFactory _factory;
    public VoyageScopingTests(MgflApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_transporter_only_sees_their_own_voyages_while_agents_see_all()
    {
        var transporteur = await _factory.CreateClient().LoginAsync("transporteur", "Route@2026");
        var own = await transporteur.GetFromJsonAsync<JsonElement>("/api/pre-declarations");
        own.EnumerateArray().Should().OnlyContain(p => p.GetProperty("code").GetString() == "PRE-2026-0042");

        var agent = await _factory.CreateClient().LoginAsync("agent.pab", "Pesage@2026");
        var all = await agent.GetFromJsonAsync<JsonElement>("/api/pre-declarations");
        all.GetArrayLength().Should().BeGreaterThanOrEqualTo(3);
    }

    [Fact]
    public async Task A_new_voyage_is_stamped_with_its_creator_and_visible_to_them()
    {
        var transporteur = await _factory.CreateClient().LoginAsync("transporteur", "Route@2026");

        var create = await transporteur.PostAsJsonAsync("/api/pre-declarations", new
        {
            matricule = "55555-T-5",
            transporteur = "Transports Atlas",
            source = "Import",
            items = new[] { new { article = "Orange", tonnage = 4m } },
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);

        var own = await transporteur.GetFromJsonAsync<JsonElement>("/api/pre-declarations");
        own.EnumerateArray().Should().Contain(p => p.GetProperty("matricule").GetString() == "55555-T-5");
    }
}
