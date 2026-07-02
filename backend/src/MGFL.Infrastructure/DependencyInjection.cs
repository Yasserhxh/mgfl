using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var connection = config.GetConnectionString("Default");

        services.AddDbContext<MgflDbContext>(options =>
        {
            if (string.IsNullOrWhiteSpace(connection))
                options.UseInMemoryDatabase("mgfl-dev");      // démarrage zéro-config en dev
            else
                options.UseSqlServer(connection);
        });

        return services;
    }
}
