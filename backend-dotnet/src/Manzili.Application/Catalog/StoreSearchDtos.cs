namespace Manzili.Application.Catalog;

/// <summary>
/// A lightweight store hit for the custom-order "find a specific seller" search. Unlike the old
/// approach (deduping stores out of a product search, which missed sellers with no listings yet),
/// this comes straight from the approved seller table.
/// </summary>
public sealed class StoreSearchItemDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Username { get; set; }
    public string Description { get; set; } = "";
    public string? Logo { get; set; }
}
