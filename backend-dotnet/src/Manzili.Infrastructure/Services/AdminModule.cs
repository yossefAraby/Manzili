using Microsoft.Extensions.DependencyInjection;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// DI registration for the Admin dashboard feature area.
/// The integrator calls <c>AddAdmin()</c> from <c>AddInfrastructure</c>.
/// </summary>
public static class AdminModule
{
    public static IServiceCollection AddAdmin(this IServiceCollection s)
    {
        s.AddScoped<AdminService>();
        s.AddScoped<ReportService>();
        return s;
    }
}
