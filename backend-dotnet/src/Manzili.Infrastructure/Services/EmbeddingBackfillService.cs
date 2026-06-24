using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// One-shot, idempotent backfill of product embeddings on startup: embeds any product whose
/// vector is still NULL (new deploy, products added before semantic search existed). After the
/// first run there's nothing to do (the WHERE embedding IS NULL query returns none), so it's
/// cheap on every boot. New/edited products are embedded inline by SellerService.
/// </summary>
public sealed class EmbeddingBackfillService : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<EmbeddingBackfillService> _log;

    public EmbeddingBackfillService(IServiceScopeFactory scopes, ILogger<EmbeddingBackfillService> log)
    {
        _scopes = scopes;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let the app finish starting before reaching out to the embedding provider + DB.
        try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
        catch (OperationCanceledException) { return; }

        try
        {
            using var scope = _scopes.CreateScope();
            var semantic = scope.ServiceProvider.GetRequiredService<SemanticSearchService>();
            await semantic.BackfillAsync(stoppingToken);
        }
        catch (Exception e)
        {
            _log.LogWarning(e, "[semantic] startup embedding backfill failed (non-fatal)");
        }
    }
}
