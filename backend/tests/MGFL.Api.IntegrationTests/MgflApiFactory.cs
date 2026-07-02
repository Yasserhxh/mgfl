using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.IntegrationTests;

/// <summary>
/// Boots the real API pipeline (auth, policies, controllers, seeding) on an isolated
/// InMemory database per factory instance, so test classes never share state.
/// </summary>
public class MgflApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"mgfl-tests-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.Single(d => d.ServiceType == typeof(DbContextOptions<MgflDbContext>));
            services.Remove(descriptor);
            services.AddDbContext<MgflDbContext>(o => o.UseInMemoryDatabase(_dbName));
        });
    }
}
