using Manzili.Api.Common;
using Manzili.Application.Reports;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>Public report submission (the buyer flag button). Admins review via /admin/reports.</summary>
[Route("api/v1/reports")]
[Authorize]
public sealed class ReportsController : ApiController
{
    private readonly ReportService _reports;

    public ReportsController(ReportService reports) => _reports = reports;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReportRequest body)
    {
        var data = await _reports.CreateAsync(CurrentPersonId, body);
        return ApiOk(data, statusCode: 201);
    }
}
