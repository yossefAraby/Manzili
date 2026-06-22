namespace Manzili.Application.Common;

/// <summary>Pagination parameters, mirroring Node utils/pagination.js parsePagination().</summary>
public readonly record struct Pagination(int Page, int Limit, int Skip, int Take)
{
    public static Pagination Parse(int? page, int? limit)
    {
        var p = Math.Max(1, page ?? 1);
        var l = Math.Min(100, Math.Max(1, limit ?? 20));
        return new Pagination(p, l, (p - 1) * l, l);
    }
}
