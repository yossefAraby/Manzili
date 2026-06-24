using Manzili.Application.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// DI registration for the Integrations feature area: Stripe checkout + webhook,
/// Bosta shipping + webhook, and Cloudinary upload.
/// </summary>
public static class IntegrationsModule
{
    public static IServiceCollection AddIntegrations(this IServiceCollection services)
    {
        // CheckoutService depends on OrderService (registered by AddOrders) and the DbContext.
        services.AddScoped<CheckoutService>();
        services.AddScoped<StripeWebhookService>();
        services.AddScoped<KashierCheckoutService>();
        services.AddScoped<KashierWebhookService>();
        services.AddScoped<BostaWebhookService>();
        services.AddScoped<UploadService>();
        services.AddScoped<ShippingService>();
        services.AddScoped<CheckoutPricingService>();
        // Size + distance shipping pricing model (pure; shared by quote, order creation, estimates).
        services.AddSingleton<ShippingPricingService>();
        services.AddScoped<EmailService>();

        // FulfillmentService orchestrates shipments/wallet/notifications across the order lifecycle.
        // It depends on WalletService (AddSeller), NotificationService (AddAccount) and BostaClient.
        services.AddScoped<FulfillmentService>();

        // Typed HttpClient for the Bosta API. BaseAddress is set from BostaOptions;
        // the Authorization header is applied per-request inside BostaClient.
        services.AddHttpClient<BostaClient>((sp, http) =>
        {
            var bosta = sp.GetRequiredService<IOptions<AppOptions>>().Value.Bosta;
            http.BaseAddress = new Uri(bosta.NormalizedBaseUrl);
        });

        return services;
    }
}
