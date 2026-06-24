using Microsoft.Extensions.DependencyInjection;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// DI registration for the Seller dashboard feature area.
/// The integrator calls <c>AddSeller()</c> from <c>AddInfrastructure</c>.
/// </summary>
public static class SellerModule
{
    public static IServiceCollection AddSeller(this IServiceCollection s)
    {
        s.AddScoped<SellerService>();
        s.AddScoped<PromotionService>();
        s.AddScoped<CouponService>();
        s.AddScoped<WalletService>();
        s.AddScoped<ReturnService>();
        s.AddScoped<WarehouseService>();
        return s;
    }
}
