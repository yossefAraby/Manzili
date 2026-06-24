namespace Manzili.Infrastructure.Services;

/// <summary>
/// Bosta-style shipping pricing: a delivery fee that depends on (a) the PACKAGE SIZE
/// (small / medium / large + a "bulky" surcharge) and (b) the DISTANCE between the seller's
/// pickup city and the buyer's drop-off city, classified into Egyptian zone tiers
/// (same city → same region → cross-country). Bosta has no public rating API wired here, so
/// this mirrors how Bosta actually tiers domestic parcels. Every quote also yields a RANGE,
/// because the exact fee varies with the seller's precise location and Bosta surcharges.
///
/// This is the single source of truth used by the cart quote, order creation (the charged
/// amount + seller payout), and the product-page / custom-form estimates.
/// </summary>
public sealed class ShippingPricingService
{
    // Base fee per package size (EGP), before the distance multiplier. A small parcel within the
    // same city sits near Bosta's real floor (~50 EGP); a large parcel is a much heavier base.
    private const decimal BaseSmall = 50m;
    private const decimal BaseMedium = 75m;
    private const decimal BaseLarge = 120m;

    // Oversized ("bulky") surcharge (EGP). Heavy/furniture pieces are expensive to move — a bench
    // is not a postal parcel — so the heavy surcharge is large, and (unlike before) the surcharge
    // scales WITH the distance multiplier in PointFee, so a heavy item across the country costs a lot.
    private const decimal BulkyLight = 40m;
    private const decimal BulkyHeavy = 150m;

    // Distance multipliers by zone relationship.
    private const decimal FactorSameCity = 1.0m;
    private const decimal FactorSameRegion = 1.35m;
    private const decimal FactorCrossCountry = 1.85m;
    private const decimal FactorUnknown = 1.3m; // buyer/seller city not resolvable → mid estimate

    // The fee band around the point estimate (real Bosta fees wobble with weight/zone edges).
    private const decimal RangeLow = 0.9m;
    private const decimal RangeHigh = 1.12m;

    public readonly record struct Quote(decimal Low, decimal High, decimal Point, string Tier, string Size);

    /// <summary>Price one seller→buyer leg for a given package size + bulky class.</summary>
    public Quote QuoteLeg(string? sellerCity, string? sellerBostaCityId,
        string? buyerCity, string? buyerBostaCityId, string? size, string? bulky)
    {
        var tier = ResolveTier(sellerCity, sellerBostaCityId, buyerCity, buyerBostaCityId);
        var point = PointFee(size, bulky, FactorForTier(tier));
        return Band(point, tier, NormalizeSize(size));
    }

    /// <summary>
    /// Price by package size ALONE, with no known cities (custom-order estimate): returns a wide
    /// range spanning same-city (low) to cross-country (high), i.e. "varies by the seller's location".
    /// </summary>
    public Quote QuoteBySize(string? size, string? bulky)
    {
        var low = PointFee(size, bulky, FactorSameCity);
        var high = PointFee(size, bulky, FactorCrossCountry);
        var mid = PointFee(size, bulky, FactorSameRegion);
        return new Quote(Round(low * RangeLow), Round(high * RangeHigh), Round(mid), "range", NormalizeSize(size));
    }

    private Quote Band(decimal point, string tier, string size) =>
        new(Round(point * RangeLow), Round(point * RangeHigh), Round(point), tier, size);

    private static decimal PointFee(string? size, string? bulky, decimal factor)
    {
        var b = NormalizeSize(size) switch
        {
            "SMALL" => BaseSmall,
            "LARGE" => BaseLarge,
            _ => BaseMedium,
        };
        var surcharge = NormalizeBulky(bulky) switch
        {
            "HEAVY" => BulkyHeavy,
            "LIGHT" => BulkyLight,
            _ => 0m,
        };
        // Surcharge scales with distance too — a heavy bench cross-country costs far more than
        // within the same city, the way real oversized freight does.
        return (b + surcharge) * factor;
    }

    private static decimal Round(decimal v) => Math.Round(v, 0, MidpointRounding.AwayFromZero);

    // ---- size / bulky normalization ----

    public static string NormalizeSize(string? s)
    {
        var v = (s ?? "").Trim().ToUpperInvariant();
        if (v.Contains("SMALL")) return "SMALL";
        if (v.Contains("LARGE") || v.Contains("BULKY")) return "LARGE";
        return "MEDIUM";
    }

    private static string NormalizeBulky(string? s)
    {
        var v = (s ?? "").Trim().ToUpperInvariant();
        if (v.Contains("HEAVY")) return "HEAVY";
        if (v.Contains("LIGHT")) return "LIGHT";
        return "NORMAL";
    }

    private static readonly string[] SizeRank = { "SMALL", "MEDIUM", "LARGE" };
    private static readonly string[] BulkyRank = { "NORMAL", "LIGHT", "HEAVY" };

    /// <summary>The dominant (largest) size + bulky class across a shipment's items.</summary>
    public static (string Size, string Bulky) Aggregate(IEnumerable<(string? Size, string? Bulky)> items)
    {
        var size = "SMALL";
        var bulky = "NORMAL";
        foreach (var (s, b) in items)
        {
            var ns = NormalizeSize(s);
            var nb = NormalizeBulky(b);
            if (Array.IndexOf(SizeRank, ns) > Array.IndexOf(SizeRank, size)) size = ns;
            if (Array.IndexOf(BulkyRank, nb) > Array.IndexOf(BulkyRank, bulky)) bulky = nb;
        }
        return (size, bulky);
    }

    // ---- Egyptian zone tiers ----

    private static decimal FactorForTier(string tier) => tier switch
    {
        "sameCity" => FactorSameCity,
        "sameRegion" => FactorSameRegion,
        "crossCountry" => FactorCrossCountry,
        _ => FactorUnknown,
    };

    /// <summary>same Bosta city / same city name → sameCity; same region → sameRegion;
    /// different known regions → crossCountry; otherwise unknown.</summary>
    public static string ResolveTier(string? sellerCity, string? sellerBostaCityId,
        string? buyerCity, string? buyerBostaCityId)
    {
        if (!string.IsNullOrWhiteSpace(sellerBostaCityId) && !string.IsNullOrWhiteSpace(buyerBostaCityId)
            && string.Equals(sellerBostaCityId.Trim(), buyerBostaCityId.Trim(), StringComparison.OrdinalIgnoreCase))
            return "sameCity";

        var s = Norm(sellerCity);
        var b = Norm(buyerCity);
        if (s.Length == 0 || b.Length == 0) return "unknown";
        if (s == b) return "sameCity";

        var rs = Region(s);
        var rb = Region(b);
        if (rs is null || rb is null) return "unknown";
        return rs == rb ? "sameRegion" : "crossCountry";
    }

    private static string Norm(string? s) => (s ?? "").Trim().ToLowerInvariant();

    // Keyword → region. Covers the common Egyptian governorate / city spellings (incl. Arabic).
    private static readonly (string Region, string[] Keys)[] RegionKeys =
    {
        ("greater_cairo", new[] { "cairo", "giza", "qalyub", "shubra", "helwan", "obour", "october", "sheikh zayed", "new cairo", "badr", "القاهرة", "الجيزة", "القليوب" }),
        ("alex_west", new[] { "alexandria", "alex", "beheira", "behera", "damanhour", "matrouh", "marsa matrouh", "الاسكندرية", "الإسكندرية", "البحيرة" }),
        ("delta", new[] { "tanta", "gharbia", "mahalla", "mansoura", "dakahlia", "zagazig", "sharqia", "sharkia", "menoufia", "monufia", "shibin", "kafr el sheikh", "kafr elsheikh", "damietta", "damiat", "طنطا", "المنصورة", "الزقازيق", "دمياط" }),
        ("canal", new[] { "port said", "portsaid", "ismailia", "ismailiya", "suez", "بورسعيد", "الاسماعيلية", "السويس" }),
        ("upper", new[] { "aswan", "luxor", "qena", "sohag", "assiut", "asyut", "minya", "minia", "beni suef", "beni sweif", "fayoum", "faiyum", "اسوان", "أسوان", "الاقصر", "الأقصر", "قنا", "سوهاج", "اسيوط", "المنيا", "الفيوم" }),
        ("sinai_redsea", new[] { "sinai", "arish", "sharm", "dahab", "taba", "hurghada", "red sea", "ghardaka", "marsa alam", "سيناء", "الغردقة", "البحر الاحمر" }),
    };

    private static string? Region(string city)
    {
        foreach (var (region, keys) in RegionKeys)
            foreach (var k in keys)
                if (city.Contains(k)) return region;
        return null;
    }
}
