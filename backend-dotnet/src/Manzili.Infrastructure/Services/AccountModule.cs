using Microsoft.Extensions.DependencyInjection;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// DI registration for the Account feature area (users/profile, addresses,
/// wishlist, notifications). Call AddAccount() from AddInfrastructure.
/// </summary>
public static class AccountModule
{
    public static IServiceCollection AddAccount(this IServiceCollection s)
    {
        s.AddScoped<UserService>();
        s.AddScoped<AddressService>();
        s.AddScoped<WishlistService>();
        s.AddScoped<NotificationService>();
        return s;
    }
}
