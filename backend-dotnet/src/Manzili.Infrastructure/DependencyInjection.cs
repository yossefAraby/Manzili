using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Security;
using Manzili.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Manzili.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Registers infrastructure services: EF Core DbContext (PostgreSQL), security
    /// helpers, feature services and (later) external integrations.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException(
                "Missing connection string 'ConnectionStrings:Default'. " +
                "Set it via user-secrets, environment, or appsettings.");

        services.AddDbContext<ManziliDbContext>(options =>
            options.UseNpgsql(connectionString));

        // Security
        services.AddSingleton<PasswordHasher>();
        services.AddSingleton<TokenService>();

        // Feature services (scoped — depend on the scoped DbContext)
        services.AddScoped<AuthService>();
        services.AddScoped<CartService>();

        // Feature modules (ported areas; each registers its own services)
        services.AddCatalog();
        services.AddAccount();
        services.AddOrders();
        services.AddSeller();
        services.AddCustom();
        services.AddAdmin();
        services.AddIntegrations();

        // One-shot startup backfill of any missing product embeddings (idempotent, cheap after first run).
        services.AddHostedService<EmbeddingBackfillService>();

        return services;
    }
}
