using Microsoft.Extensions.DependencyInjection;

namespace Manzili.Infrastructure.Services;

/// <summary>DI registration for the Catalog feature area (products, search, store, ratings).</summary>
public static class CatalogModule
{
    public static IServiceCollection AddCatalog(this IServiceCollection s)
    {
        s.AddScoped<ProductService>();
        s.AddScoped<SearchService>();
        s.AddScoped<StoreService>();
        s.AddScoped<RatingService>();
        return s;
    }
}
