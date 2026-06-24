namespace Manzili.Infrastructure.Persistence.Entities;

/// <summary>
/// A buyer's recently-viewed product. The table (manzili.product_views) is created by SchemaMigrator,
/// not the EF scaffold — one row per (person, product), re-views just refresh viewed_at. Powers the
/// recently-viewed recommendation seeds and the "most popular" shop sort (popularity = view count).
/// </summary>
public partial class ProductView
{
    public int Personid { get; set; }
    public int Productid { get; set; }
    public DateTime ViewedAt { get; set; }
}
