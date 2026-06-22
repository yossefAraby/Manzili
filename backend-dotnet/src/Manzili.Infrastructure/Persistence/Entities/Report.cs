using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Report
{
    public int ReportId { get; set; }

    public int? ReporterId { get; set; }

    public string Type { get; set; } = null!;

    public string Reason { get; set; } = null!;

    public string? Description { get; set; }

    public string Status { get; set; } = null!;

    public string? AdminNote { get; set; }

    public int? Productid { get; set; }

    public int? Sellerid { get; set; }

    public int? StoreOrderid { get; set; }

    public int? CustomRequestid { get; set; }

    public DateTime? ResolvedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual CustomRequest? CustomRequest { get; set; }

    public virtual Person? Reporter { get; set; }

    public virtual Seller? Seller { get; set; }
}
