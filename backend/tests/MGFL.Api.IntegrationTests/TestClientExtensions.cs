using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace MGFL.Api.IntegrationTests;

public static class TestClientExtensions
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>Logs in with a seeded demo account and attaches the Bearer token to the client.</summary>
    public static async Task<HttpClient> LoginAsync(this HttpClient client, string username, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { username, password });
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        var token = payload.GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
