using System;

namespace Manzili.Infrastructure.Persistence.Entities;

/// <summary>
/// A paid "feature my product" promotion. The seller pays Manzili to surface a product in the
/// homepage Featured section for a window (50 EGP/day or 300 EGP/week). Active promotions (ExpiresAt
/// in the future) are featured FIFO; overflow beyond the home's slots simply waits its turn (queue).
/// </summary>
public partial class Promotion
{
    public int Promotionid { get; set; }
    public int Productid { get; set; }
    public int Sellerid { get; set; }
    /// <summary>"day" or "week".</summary>
    public string Plan { get; set; } = "day";
    /// <summary>What the seller paid Manzili (platform revenue).</summary>
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}
