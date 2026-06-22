using Microsoft.Extensions.DependencyInjection;

namespace Manzili.Infrastructure.Services;

/// <summary>DI registration for the Orders feature (buyer side).</summary>
public static class OrdersModule
{
    public static IServiceCollection AddOrders(this IServiceCollection services)
    {
        services.AddScoped<OrderService>();
        return services;
    }
}
