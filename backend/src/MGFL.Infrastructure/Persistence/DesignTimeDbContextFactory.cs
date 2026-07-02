using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace MGFL.Infrastructure.Persistence;

/// <summary>
/// Factory used exclusively by the EF Core tooling (`dotnet ef migrations …`) to build
/// the context against the SQL Server provider without booting the API host.
/// The connection string is a placeholder — migrations generation never connects.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<MgflDbContext>
{
    public MgflDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<MgflDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=MGFL;Trusted_Connection=True;")
            .Options;
        return new MgflDbContext(options);
    }
}
