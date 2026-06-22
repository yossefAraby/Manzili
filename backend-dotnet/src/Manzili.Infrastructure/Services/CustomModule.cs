using Microsoft.Extensions.DependencyInjection;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// DI registration for the Custom Requests &amp; Offers feature area.
/// The integrator calls <c>AddCustom()</c> from <c>AddInfrastructure</c>.
/// </summary>
public static class CustomModule
{
    public static IServiceCollection AddCustom(this IServiceCollection s)
    {
        s.AddScoped<CustomRequestService>();
        s.AddScoped<OfferService>();
        return s;
    }
}
