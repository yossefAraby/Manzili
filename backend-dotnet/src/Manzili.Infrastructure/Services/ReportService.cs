using Manzili.Application.Common;
using Manzili.Application.Reports;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Creates user-submitted reports (the buyer "flag" button). Admins review/act on them via the
/// existing AdminService report endpoints. Reports land as PENDING.
/// </summary>
public sealed class ReportService
{
    private readonly ManziliDbContext _db;

    public ReportService(ManziliDbContext db) => _db = db;

    private static readonly HashSet<string> ValidTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "NON_HANDMADE_PRODUCT", "SELLER_MISCONDUCT", "UNFULFILLED_CUSTOM_REQUEST", "GENERAL",
    };

    public async Task<CreateReportResult> CreateAsync(int? reporterPersonId, CreateReportRequest req)
    {
        var type = (req.Type ?? "GENERAL").ToUpperInvariant();
        if (!ValidTypes.Contains(type)) type = "GENERAL";
        if (string.IsNullOrWhiteSpace(req.Reason)) throw new ValidationAppException("A reason is required");

        static int? ParseId(string? s) => int.TryParse(s, out var v) ? v : null;

        var report = new Report
        {
            ReporterId = reporterPersonId,
            Type = type,
            Reason = req.Reason!,
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description,
            Status = "PENDING",
            Productid = ParseId(req.ProductId),
            Sellerid = ParseId(req.StoreId),
            StoreOrderid = ParseId(req.StoreOrderId),
            CustomRequestid = ParseId(req.CustomRequestId),
            // reports.created_at is `timestamp without time zone` → use Unspecified Kind.
            CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
        };
        _db.Reports.Add(report);
        await _db.SaveChangesAsync();

        return new CreateReportResult { Id = report.ReportId.ToString(), Status = "PENDING" };
    }
}
