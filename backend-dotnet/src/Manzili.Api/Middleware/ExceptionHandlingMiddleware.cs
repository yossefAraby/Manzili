using System.Text.Json;
using Manzili.Application.Common;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Manzili.Api.Middleware;

/// <summary>
/// Global error handler mirroring Node middleware/errorHandler.js — maps operational
/// errors, EF/Postgres errors (unique/not-found) and unknowns to the error envelope.
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await WriteError(context, ex);
        }
    }

    private async Task WriteError(HttpContext context, Exception ex)
    {
        int status;
        object error;

        switch (ex)
        {
            case AppException appEx:
                status = appEx.StatusCode;
                error = appEx.Details is not null
                    ? new { message = appEx.Message, code = appEx.Code, details = appEx.Details }
                    : new { message = appEx.Message, code = appEx.Code };
                break;

            case DbUpdateException dbEx when IsUniqueViolation(dbEx):
                status = 409;
                error = new { message = "Duplicate value", code = "CONFLICT" };
                break;

            default:
                status = 500;
                _logger.LogError(ex, "[unhandled] {Message}", ex.Message);
                error = new { message = "Internal server error", code = "INTERNAL_ERROR" };
                break;
        }

        if (context.Response.HasStarted)
            return;

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { success = false, error }, JsonOpts));
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: "23505" };
}
