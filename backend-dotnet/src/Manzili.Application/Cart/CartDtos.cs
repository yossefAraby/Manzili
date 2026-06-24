namespace Manzili.Application.Cart;

/// <summary>
/// One persisted cart line. <see cref="Variant"/> is the frontend's serialized variant selection
/// (a small JSON/string blob, opaque to the backend) so a restored cart remembers exactly which
/// option the buyer picked. Prices are never stored here — checkout always recomputes them
/// server-side from the live product, so a stale cart can't drive a wrong charge.
/// </summary>
public sealed class CartItemDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public string? Variant { get; set; }
}

/// <summary>Body for PUT /cart (replace) and POST /cart/merge.</summary>
public sealed class SaveCartRequest
{
    public List<CartItemDto> Items { get; set; } = new();
}
