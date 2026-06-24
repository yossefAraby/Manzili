using System.Text.Json;
using Manzili.Application.Cart;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// The account-linked cart. The active cart is stored as a variant-faithful JSON snapshot on the
/// buyer's <c>cart</c> row (<c>items_json</c>), keyed to the person — so it survives logout, follows
/// the account across devices, and is never browser-local. There is exactly one cart row per person.
///
/// Lines hold only productId + quantity + the opaque serialized variant; the cart is re-priced
/// from the live catalog at checkout, so persisting client line hints is safe.
/// </summary>
public sealed class CartService
{
    private const int MaxLines = 200;
    private const int MaxQty = 999;
    private const int MaxVariantLen = 2000;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    private readonly ManziliDbContext _db;

    public CartService(ManziliDbContext db) => _db = db;

    /// <summary>The buyer's saved cart lines (empty when they have none).</summary>
    public async Task<List<CartItemDto>> GetCartAsync(int personId)
    {
        var cart = await _db.Carts.AsNoTracking()
            .Where(c => c.Creatorid == personId)
            .OrderByDescending(c => c.Cartid)
            .FirstOrDefaultAsync();
        return Deserialize(cart?.ItemsJson);
    }

    /// <summary>Replace the buyer's cart with the given lines (the frontend pushes the whole cart).</summary>
    public async Task<List<CartItemDto>> SaveCartAsync(int personId, IEnumerable<CartItemDto>? items)
    {
        var clean = Sanitize(items);
        var cart = await GetOrCreateAsync(personId);
        cart.ItemsJson = clean.Count == 0 ? null : JsonSerializer.Serialize(clean, JsonOpts);
        await _db.SaveChangesAsync();
        return clean;
    }

    /// <summary>
    /// Merge incoming (guest) lines into the buyer's saved cart, summing quantities for the same
    /// product+variant. Used on login so a guest's basket isn't lost when they sign in.
    /// </summary>
    public async Task<List<CartItemDto>> MergeCartAsync(int personId, IEnumerable<CartItemDto>? incoming)
    {
        var cart = await GetOrCreateAsync(personId);
        var merged = Merge(Deserialize(cart.ItemsJson), Sanitize(incoming));
        cart.ItemsJson = merged.Count == 0 ? null : JsonSerializer.Serialize(merged, JsonOpts);
        await _db.SaveChangesAsync();
        return merged;
    }

    /// <summary>Empty the buyer's cart (e.g. after a successful checkout).</summary>
    public async Task ClearCartAsync(int personId)
    {
        var cart = await _db.Carts
            .Where(c => c.Creatorid == personId)
            .OrderByDescending(c => c.Cartid)
            .FirstOrDefaultAsync();
        if (cart is not null && cart.ItemsJson is not null)
        {
            cart.ItemsJson = null;
            await _db.SaveChangesAsync();
        }
    }

    private async Task<Cart> GetOrCreateAsync(int personId)
    {
        var cart = await _db.Carts
            .Where(c => c.Creatorid == personId)
            .OrderByDescending(c => c.Cartid)
            .FirstOrDefaultAsync();
        if (cart is null)
        {
            cart = new Cart { Creatorid = personId, CreatedAt = DateTime.UtcNow };
            _db.Carts.Add(cart);
        }
        return cart;
    }

    private static List<CartItemDto> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try { return JsonSerializer.Deserialize<List<CartItemDto>>(json!, JsonOpts) ?? new(); }
        catch { return new(); }
    }

    private static List<CartItemDto> Sanitize(IEnumerable<CartItemDto>? items)
    {
        var list = new List<CartItemDto>();
        if (items is null) return list;
        foreach (var it in items)
        {
            if (it is null || it.ProductId <= 0) continue;
            var qty = Math.Clamp(it.Quantity, 1, MaxQty);
            var variant = it.Variant;
            if (variant != null && variant.Length > MaxVariantLen) variant = variant[..MaxVariantLen];
            list.Add(new CartItemDto
            {
                ProductId = it.ProductId,
                Quantity = qty,
                Variant = string.IsNullOrEmpty(variant) ? null : variant,
            });
            if (list.Count >= MaxLines) break;
        }
        return list;
    }

    private static List<CartItemDto> Merge(List<CartItemDto> existing, List<CartItemDto> incoming)
    {
        var map = new Dictionary<string, CartItemDto>();
        var order = new List<string>();
        foreach (var it in existing.Concat(incoming))
        {
            var key = it.ProductId + "::" + (it.Variant ?? "");
            if (map.TryGetValue(key, out var ex))
                ex.Quantity = Math.Min(MaxQty, ex.Quantity + it.Quantity);
            else
            {
                map[key] = new CartItemDto { ProductId = it.ProductId, Quantity = it.Quantity, Variant = it.Variant };
                order.Add(key);
            }
        }
        return order.Select(k => map[k]).ToList();
    }
}
